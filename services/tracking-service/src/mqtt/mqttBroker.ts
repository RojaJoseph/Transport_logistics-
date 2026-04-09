/**
 * MQTT Broker Client (Production Ready)
 */

import mqtt, { MqttClient } from 'mqtt';
import { Server as SocketIO } from 'socket.io';
import Redis from 'ioredis';
import { GpsPosition, Device } from '../models/GpsPosition';
import { processGeofences } from '../geofence/geofenceEngine';
import { parseNMEA } from './nmeaParser';

// ────────────────────────────────────────────────────────────────
// ENV CONFIG
// ────────────────────────────────────────────────────────────────
const MQTT_URL  = process.env.MQTT_URL  ?? 'mqtt://mosquitto:1883';
const MQTT_USER = process.env.MQTT_USER ?? '';
const MQTT_PASS = process.env.MQTT_PASS ?? '';

// ────────────────────────────────────────────────────────────────
// TYPE
// ────────────────────────────────────────────────────────────────
type Position = {
  deviceId: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  satellites: number;
  timestamp: Date;
  temp?: number;
  humidity?: number;
  fuelPct?: number;
  engineOn?: boolean;
  shockG?: number;
  odometer?: number;
  signalRssi?: number;
  rawPayload: Record<string, any>;
};

// ────────────────────────────────────────────────────────────────
// MQTT SETUP
// ────────────────────────────────────────────────────────────────
export async function setupMQTT(io: SocketIO, redis: Redis): Promise<void> {
  const client: MqttClient = mqtt.connect(MQTT_URL, {
    username: MQTT_USER || undefined,
    password: MQTT_PASS || undefined,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    clientId: `tracking-${process.pid}`,
    clean: true,
  });

  client.on('connect', () => {
    console.log('[mqtt] Connected:', MQTT_URL);

    client.subscribe('gps/+/position', { qos: 1 });
    client.subscribe('gps/+/nmea', { qos: 0 });
    client.subscribe('gps/+/heartbeat', { qos: 0 });
    client.subscribe('gps/+/telemetry', { qos: 1 });

    console.log('[mqtt] Subscribed topics');
  });

  client.on('error', (err) => {
    console.error('[mqtt] Error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('[mqtt] Reconnecting...');
  });

  client.on('message', async (topic: string, payload: Buffer) => {
    try {
      const [_, deviceId, msgType] = topic.split('/');

      if (!deviceId) return;

      // ── NMEA ─────────────────────────────
      if (msgType === 'nmea') {
        const parsed = parseNMEA(payload.toString());
        if (!parsed) return;

        const position: Position = {
          deviceId,
          ...parsed,
          rawPayload: parsed,
        };

        await handlePositionUpdate(position, io, redis);
        return;
      }

      // ── Heartbeat ────────────────────────
      if (msgType === 'heartbeat') {
        await Device.findOneAndUpdate(
          { deviceId },
          { lastSeen: new Date() }
        );

        io.to(`device:${deviceId}`).emit('heartbeat', {
          deviceId,
          ts: Date.now(),
        });

        return;
      }

      // ── JSON Payload ─────────────────────
      let data: Record<string, any>;
      try {
        data = JSON.parse(payload.toString());
      } catch {
        console.warn('[mqtt] Invalid JSON:', topic);
        return;
      }

      if (msgType === 'position' || msgType === 'telemetry') {
        const position = normalisePayload(deviceId, data);
        await handlePositionUpdate(position, io, redis);
      }

    } catch (err: any) {
      console.error('[mqtt] Message error:', err.message);
    }
  });
}

// ────────────────────────────────────────────────────────────────
// NORMALISER
// ────────────────────────────────────────────────────────────────
function normalisePayload(deviceId: string, d: Record<string, any>): Position {
  return {
    deviceId,
    lat: Number(d.lat ?? d.latitude ?? 0),
    lng: Number(d.lng ?? d.longitude ?? 0),
    altitude: Number(d.alt ?? d.altitude ?? 0),
    speed: Number(d.speed ?? 0),
    heading: Number(d.heading ?? 0),
    accuracy: Number(d.accuracy ?? 0),
    satellites: Number(d.satellites ?? 0),
    timestamp: d.ts ? new Date(Number(d.ts)) : new Date(),
    temp: d.temp != null ? Number(d.temp) : undefined,
    humidity: d.hum != null ? Number(d.hum) : undefined,
    fuelPct: d.fuel != null ? Number(d.fuel) : undefined,
    engineOn: d.engine != null ? Boolean(d.engine) : undefined,
    shockG: d.shock != null ? Number(d.shock) : undefined,
    odometer: d.odo != null ? Number(d.odo) : undefined,
    signalRssi: d.rssi != null ? Number(d.rssi) : undefined,
    rawPayload: d,
  };
}

// ────────────────────────────────────────────────────────────────
// CORE HANDLER
// ────────────────────────────────────────────────────────────────
async function handlePositionUpdate(
  pos: Position,
  io: SocketIO,
  redis: Redis
) {
  if (!pos.lat || !pos.lng) return;

  try {
    // 1. Device lookup
    const device = await Device.findOne({ deviceId: pos.deviceId }).lean();

    const shipmentId = device?.shipmentId ?? pos.deviceId;
    const vehicleId = device?.vehicleId ?? pos.deviceId;

    const fullPos = { ...pos, shipmentId, vehicleId };

    // 2. Save DB
    await GpsPosition.create(fullPos);

    // 3. Cache
    await redis.setex(
      `track:live:${pos.deviceId}`,
      300,
      JSON.stringify(fullPos)
    );

    // 4. Pub/Sub
    await redis.publish('tracking:position', JSON.stringify(fullPos));

    // 5. Socket broadcast
    const event = {
      deviceId: pos.deviceId,
      shipmentId,
      vehicleId,
      lat: pos.lat,
      lng: pos.lng,
      speed: pos.speed,
      heading: pos.heading,
      ts: pos.timestamp,
    };

    io.to(`shipment:${shipmentId}`).emit('position', event);
    io.to(`vehicle:${vehicleId}`).emit('position', event);
    io.to('tracking:all').emit('position', event);

    // 6. Update device
    await Device.findOneAndUpdate(
      { deviceId: pos.deviceId },
      { lastSeen: new Date() }
    );

    // 7. Geofence
    processGeofences(fullPos, io, redis).catch(console.error);

  } catch (err: any) {
    console.error('[tracking] Processing error:', err.message);
  }
}