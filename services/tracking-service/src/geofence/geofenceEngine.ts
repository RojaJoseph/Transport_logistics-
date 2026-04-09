/**
 * Geofence Engine
 * Evaluates every incoming position against all active geofences.
 * Fires enter/exit events via Socket.IO and persists alerts to Redis.
 */

import { Server as SocketIO } from 'socket.io';
import Redis from 'ioredis';
import { getDistance, isPointInPolygon } from 'geolib';
import { Geofence } from '../models/GpsPosition';

interface PositionPayload {
  deviceId:   string;
  shipmentId: string;
  vehicleId:  string;
  lat:        number;
  lng:        number;
  timestamp:  Date;
}

/**
 * Check point against all active geofences.
 * State (inside/outside) is stored in Redis to detect transitions.
 */
export async function processGeofences(
  pos: PositionPayload,
  io: SocketIO,
  redis: Redis,
): Promise<void> {
  const fences = await Geofence.find({ active: true, assignedTo: { $in: [pos.shipmentId, pos.vehicleId] } }).lean();
  if (!fences.length) return;

  for (const fence of fences) {
    const inside = isInsideFence(pos, fence as any);
    const stateKey = `geo:state:${fence._id}:${pos.deviceId}`;
    const prevState = await redis.get(stateKey);   // 'inside' | 'outside' | null

    // Set current state
    await redis.setex(stateKey, 3600, inside ? 'inside' : 'outside');

    // Detect transition
    const entered = inside  && prevState !== 'inside';
    const exited  = !inside && prevState === 'inside';

    if (entered && fence.alertOnEnter) {
      const alert = buildGeofenceAlert('ENTER', pos, fence as any);
      await emitAndStore(alert, io, redis);
    }
    if (exited && fence.alertOnExit) {
      const alert = buildGeofenceAlert('EXIT', pos, fence as any);
      await emitAndStore(alert, io, redis);
    }
  }
}

function isInsideFence(pos: { lat: number; lng: number }, fence: any): boolean {
  if (fence.type === 'circle') {
    const dist = getDistance(
      { latitude: pos.lat, longitude: pos.lng },
      { latitude: fence.center.lat, longitude: fence.center.lng }
    );
    return dist <= fence.radiusMetres;
  }
  if (fence.type === 'polygon' && fence.polygon?.length >= 3) {
    return isPointInPolygon(
      { latitude: pos.lat, longitude: pos.lng },
      fence.polygon.map((p: any) => ({ latitude: p.lat, longitude: p.lng }))
    );
  }
  return false;
}

function buildGeofenceAlert(event: 'ENTER' | 'EXIT', pos: PositionPayload, fence: any) {
  return {
    type:       'GEOFENCE_ALERT',
    event,
    fenceId:    fence._id.toString(),
    fenceName:  fence.name,
    deviceId:   pos.deviceId,
    shipmentId: pos.shipmentId,
    vehicleId:  pos.vehicleId,
    lat:        pos.lat,
    lng:        pos.lng,
    severity:   event === 'EXIT' ? 'warning' : 'info',
    message:    `Vehicle ${pos.vehicleId} ${event === 'ENTER' ? 'entered' : 'exited'} geofence "${fence.name}"`,
    timestamp:  new Date().toISOString(),
  };
}

async function emitAndStore(alert: ReturnType<typeof buildGeofenceAlert>, io: SocketIO, redis: Redis) {
  // Broadcast to rooms
  io.to(`shipment:${alert.shipmentId}`).emit('geofence_alert', alert);
  io.to('tracking:all').emit('geofence_alert', alert);

  // Store in Redis list for recent-alerts API (last 100)
  await redis.lpush('geo:alerts:recent', JSON.stringify(alert));
  await redis.ltrim('geo:alerts:recent', 0, 99);

  console.log(`[geofence] ${alert.event}: ${alert.vehicleId} @ ${alert.fenceName}`);
}
