/**
 * TrackingModule — Custom GPS Live Tracking (Leaflet + Socket.IO)
 *
 * Features:
 *  - Live map with real-time vehicle markers (auto-updating)
 *  - Animated polyline trail (last N positions)
 *  - IoT telemetry panel (temp, fuel, engine, speed, satellites)
 *  - Event timeline with geofence alerts
 *  - Shipment search and history playback
 *  - Stats card: distance, avg speed, idle time
 *  - Device registration panel
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import {
  MapPin, Thermometer, Zap, Navigation, Clock, Package,
  Fuel, Radio, Satellite, AlertTriangle, Play, Search,
  ChevronRight, Activity, Gauge, RefreshCw, Settings, Plus
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
interface LivePosition {
  deviceId:   string;
  shipmentId: string;
  vehicleId:  string;
  lat:        number;
  lng:        number;
  speed:      number;
  heading:    number;
  altitude?:  number;
  temp?:      number;
  fuelPct?:   number;
  engineOn?:  boolean;
  ts:         string;
}

interface TrailPoint { lat: number; lng: number; ts: string; }

interface GeofenceAlert {
  event:      'ENTER' | 'EXIT';
  fenceName:  string;
  vehicleId:  string;
  timestamp:  string;
  severity:   string;
}

interface ShipmentStats {
  distanceKm: number;
  avgSpeed:   number;
  maxSpeed:   number;
  idleMinutes:number;
  totalPoints:number;
}

// ── Inline Leaflet map (CDN, no bundler dependency) ───────────────
function LiveMap({ positions, trail, selectedId }: {
  positions: Map<string, LivePosition>;
  trail:     TrailPoint[];
  selectedId:string;
}) {
  const mapRef  = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polyRef = useRef<any>(null);
  const divRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    // Load Leaflet CSS dynamically
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);

    function initMap() {
      const L = (window as any).L;
      if (!divRef.current || mapRef.current) return;

      mapRef.current = L.map(divRef.current, {
        center:           [20.5937, 78.9629],  // India
        zoom:             5,
        zoomControl:      true,
        attributionControl:false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);
    }
  }, []);

  // Update markers whenever positions change
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    positions.forEach((pos, id) => {
      const isSelected = id === selectedId;
      const color = pos.engineOn === false ? '#ff1744' : pos.speed === 0 ? '#ffab00' : '#00e5ff';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            position:relative;
            width:${isSelected ? 40 : 32}px;
            height:${isSelected ? 40 : 32}px;
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              width:${isSelected ? 32 : 24}px;height:${isSelected ? 32 : 24}px;
              background:${color};border-radius:50%;
              border:${isSelected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.5)'};
              box-shadow:0 0 ${isSelected ? 16 : 8}px ${color};
              display:flex;align-items:center;justify-content:center;
              transform:rotate(${pos.heading}deg);
              transition:all 0.5s ease;
            ">
              <svg width="${isSelected ? 16 : 12}" height="${isSelected ? 16 : 12}" viewBox="0 0 24 24" fill="${isSelected ? '#000' : '#000'}">
                <path d="M12 2L4 20h16L12 2z"/>
              </svg>
            </div>
            ${isSelected ? `<div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#00e5ff;padding:2px 6px;border-radius:4px;font-size:10px;white-space:nowrap;font-family:monospace;">${pos.vehicleId}</div>` : ''}
            ${pos.speed > 0 ? `<div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);color:${color};font-size:9px;font-family:monospace;white-space:nowrap;">${Math.round(pos.speed)} km/h</div>` : ''}
          </div>`,
        iconSize:   [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 20 : 16],
      });

      if (markersRef.current.has(id)) {
        const marker = markersRef.current.get(id);
        marker.setLatLng([pos.lat, pos.lng]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(mapRef.current);
        marker.bindTooltip(`${pos.vehicleId} · ${pos.deviceId}`, { permanent: false });
        markersRef.current.set(id, marker);
      }
    });
  }, [positions, selectedId]);

  // Draw trail for selected shipment
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    if (trail.length < 2) return;

    const latlngs = trail.map(p => [p.lat, p.lng]);
    polyRef.current = L.polyline(latlngs as any, {
      color: '#00e5ff',
      weight: 3,
      opacity: 0.7,
      dashArray: '8 4',
    }).addTo(mapRef.current);

    // Fit map to trail
    mapRef.current.fitBounds(polyRef.current.getBounds(), { padding: [40, 40] });
  }, [trail]);

  return (
    <div ref={divRef} style={{ width: '100%', height: '100%', background: '#0a0c10' }}
      className="rounded-xl overflow-hidden" />
  );
}

// ── Demo simulator (replaces real GPS in dev) ─────────────────────
function useSimulatedPositions(enabled: boolean) {
  const [positions, setPositions] = useState<Map<string, LivePosition>>(new Map());

  const VEHICLES = [
    { deviceId: 'DEV-001', shipmentId: 'SHP-2847', vehicleId: 'TN-09-AB-3421', lat: 19.076, lng: 72.877 },
    { deviceId: 'DEV-002', shipmentId: 'SHP-2848', vehicleId: 'DL-01-CA-5892', lat: 28.700, lng: 77.100 },
    { deviceId: 'DEV-003', shipmentId: 'SHP-2849', vehicleId: 'KA-05-MN-8823', lat: 12.971, lng: 77.594 },
    { deviceId: 'DEV-004', shipmentId: 'SHP-2850', vehicleId: 'MH-12-GH-4411', lat: 18.520, lng: 73.856 },
  ];

  // Simulate movement
  const refs = useRef(VEHICLES.map(v => ({ ...v, heading: Math.random() * 360, speed: 40 + Math.random() * 60, fuel: 60 + Math.random() * 30, temp: 20 + Math.random() * 10 })));

  useEffect(() => {
    if (!enabled) return;
    const init = new Map<string, LivePosition>();
    refs.current.forEach(v => {
      init.set(v.deviceId, {
        deviceId: v.deviceId, shipmentId: v.shipmentId, vehicleId: v.vehicleId,
        lat: v.lat, lng: v.lng, speed: v.speed, heading: v.heading,
        temp: v.temp, fuelPct: v.fuel, engineOn: true, ts: new Date().toISOString(),
      });
    });
    setPositions(init);

    const id = setInterval(() => {
      setPositions(prev => {
        const next = new Map(prev);
        refs.current.forEach(v => {
          const old = next.get(v.deviceId);
          if (!old) return;
          const headingDrift = (Math.random() - 0.5) * 20;
          const newHeading   = (old.heading + headingDrift + 360) % 360;
          const rad          = newHeading * Math.PI / 180;
          const dist         = (old.speed / 3600) * 3 * 0.01;  // approx degrees per tick
          const newLat       = old.lat + Math.cos(rad) * dist;
          const newLng       = old.lng + Math.sin(rad) * dist;
          const newSpeed     = Math.max(20, Math.min(120, old.speed + (Math.random() - 0.5) * 10));
          next.set(v.deviceId, {
            ...old,
            lat: Math.round(newLat * 100000) / 100000,
            lng: Math.round(newLng * 100000) / 100000,
            heading: Math.round(newHeading),
            speed: Math.round(newSpeed),
            fuelPct: Math.max(5, (old.fuelPct ?? 80) - 0.05),
            ts: new Date().toISOString(),
          });
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(id);
  }, [enabled]);

  return positions;
}

// ── Telemetry Card ────────────────────────────────────────────────
function TelemetryCard({ pos }: { pos: LivePosition | undefined }) {
  if (!pos) return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <Satellite size={24} style={{ color: 'var(--color-text-muted)' }} />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Select a vehicle to view telemetry</p>
    </div>
  );

  const rows = [
    { icon: Gauge,       label: 'Speed',       value: `${pos.speed} km/h`,                  color: '#00e5ff' },
    { icon: Navigation,  label: 'Heading',     value: `${pos.heading}°`,                    color: '#7c3aed' },
    { icon: Thermometer, label: 'Temperature', value: pos.temp != null ? `${pos.temp.toFixed(1)}°C` : '—', color: pos.temp != null && pos.temp > 8 ? '#ff1744' : '#00e5ff' },
    { icon: Fuel,        label: 'Fuel',        value: pos.fuelPct != null ? `${pos.fuelPct.toFixed(0)}%` : '—', color: (pos.fuelPct ?? 100) < 20 ? '#ff1744' : '#00e676' },
    { icon: Zap,         label: 'Engine',      value: pos.engineOn == null ? '—' : pos.engineOn ? 'ON' : 'OFF', color: pos.engineOn ? '#00e676' : '#ff1744' },
    { icon: MapPin,      label: 'Position',    value: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`, color: '#00e5ff' },
  ];

  return (
    <div className="space-y-2">
      {rows.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <Icon size={13} style={{ color, flexShrink: 0 }} />
          <span className="text-xs flex-1" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          <span className="text-xs font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: ShipmentStats | null }) {
  if (!stats) return null;
  const items = [
    { label: 'Distance',  value: `${stats.distanceKm} km`,      color: '#00e5ff' },
    { label: 'Avg Speed', value: `${stats.avgSpeed} km/h`,       color: '#7c3aed' },
    { label: 'Max Speed', value: `${stats.maxSpeed} km/h`,       color: '#ff6b2b' },
    { label: 'Idle Time', value: `${stats.idleMinutes} min`,     color: '#ffab00' },
    { label: 'GPS Points',value: stats.totalPoints.toLocaleString(), color: '#00e676' },
  ];
  return (
    <div className="flex gap-4 px-4 py-2 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {items.map(({ label, value, color }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          <span className="text-sm font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────
export default function TrackingModule() {
  const [query, setQuery]         = useState('');
  const [selectedId, setSelected] = useState('DEV-001');
  const [trail, setTrail]         = useState<TrailPoint[]>([]);
  const [alerts, setAlerts]       = useState<GeofenceAlert[]>([]);
  const [tab, setTab]             = useState<'live'|'history'|'devices'|'geofences'>('live');
  const [wsStatus, setWsStatus]   = useState<'connecting'|'live'|'offline'>('connecting');
  const [stats, setStats]         = useState<ShipmentStats | null>(null);

  // In dev/demo mode use simulated positions; in production swap for Socket.IO
  const simPositions = useSimulatedPositions(true);

  // Socket.IO connection (production)
  const socketRef = useRef<Socket | null>(null);
  const [livePositions, setLivePositions] = useState<Map<string, LivePosition>>(new Map());

  useEffect(() => {
    const WS_URL = (import.meta as any).env?.VITE_WS_TRACKING ?? 'http://localhost:4003';
    const socket = socketIO(WS_URL, { transports: ['websocket','polling'] });
    socketRef.current = socket;

    socket.on('connect',    () => setWsStatus('live'));
    socket.on('disconnect', () => setWsStatus('offline'));
    socket.on('connect_error', () => setWsStatus('offline'));

    socket.emit('subscribe:all');

    socket.on('position', (pos: LivePosition) => {
      setLivePositions(prev => new Map(prev).set(pos.deviceId, pos));
      // Append to trail if selected
      setTrail(prev => {
        if (pos.deviceId !== selectedId) return prev;
        return [...prev.slice(-499), { lat: pos.lat, lng: pos.lng, ts: pos.ts }];
      });
    });

    socket.on('geofence_alert', (alert: GeofenceAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    });

    return () => { socket.disconnect(); };
  }, [selectedId]);

  // Use simulated if WS is offline (demo fallback)
  const positions = wsStatus === 'live' ? livePositions : simPositions;

  const selectedPos = positions.get(selectedId);

  // Compute simulated trail for selected device in demo mode
  useEffect(() => {
    if (wsStatus !== 'live' && selectedPos) {
      setTrail(prev => [...prev.slice(-199), { lat: selectedPos.lat, lng: selectedPos.lng, ts: selectedPos.ts }]);
    }
  }, [selectedPos, wsStatus]);

  // Simulated stats
  const demoStats: ShipmentStats = { distanceKm: 284.5, avgSpeed: 64, maxSpeed: 98, idleMinutes: 42, totalPoints: trail.length + 1200 };

  const vehicleList = Array.from(positions.values());

  const DEMO_EVENTS = [
    { time: '14:32', label: 'Position Updated',    color: '#00e5ff' },
    { time: '14:28', label: 'Geofence: Entered Pune City', color: '#ffab00' },
    { time: '14:10', label: 'Speed Alert: 98 km/h', color: '#ff1744' },
    { time: '13:55', label: 'Engine Restarted',    color: '#00e676' },
    { time: '12:40', label: 'Fuel: 30% remaining', color: '#ffab00' },
    { time: '11:00', label: 'Departed Mumbai',     color: '#7c3aed' },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Live GPS Tracking <span style={{ color: '#16a34a' }}>Custom</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            MQTT · Socket.IO · Leaflet · MongoDB time-series · Geofencing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatsBar stats={demoStats} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)' }}>
            <div className="w-2 h-2 rounded-full live-dot"
              style={{ background: wsStatus === 'live' ? '#00e676' : wsStatus === 'offline' ? '#ff1744' : '#ffab00' }} />
            <span style={{ color: wsStatus === 'live' ? '#00e676' : wsStatus === 'offline' ? '#ff1744' : '#ffab00' }}>
              {wsStatus === 'live' ? 'WS LIVE' : wsStatus === 'offline' ? 'DEMO MODE' : 'CONNECTING'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {(['live','history','devices','geofences'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={{ background: tab === t ? '#16a34a' : 'transparent', color: tab === t ? '#fff' : 'var(--color-text-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── LIVE MAP TAB ──────────────────────────────────────────── */}
      {tab === 'live' && (
        <div className="flex gap-4 flex-1 min-h-0" style={{ height: 600 }}>
          {/* Sidebar */}
          <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search vehicle / shipment..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl outline-none"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            </div>

            {/* Vehicle list */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="px-3 py-2 text-xs font-semibold tracking-widest"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                ACTIVE VEHICLES ({vehicleList.length})
              </div>
              {vehicleList
                .filter(v => !query || v.vehicleId.toLowerCase().includes(query.toLowerCase()) || v.shipmentId.toLowerCase().includes(query.toLowerCase()))
                .map((v) => {
                  const active = v.deviceId === selectedId;
                  const dotColor = v.engineOn === false ? '#ff1744' : v.speed === 0 ? '#ffab00' : '#00e676';
                  return (
                    <button key={v.deviceId} onClick={() => setSelected(v.deviceId)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                      style={{
                        background: active ? 'rgba(0,229,255,0.06)' : 'var(--color-surface)',
                        borderLeft: active ? '2px solid #00e5ff' : '2px solid transparent',
                        borderBottom: '1px solid var(--color-border)',
                      }}>
                      <div className="w-2 h-2 rounded-full live-dot shrink-0" style={{ background: dotColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate" style={{ color: active ? '#00e5ff' : 'var(--color-text)' }}>{v.vehicleId}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{v.shipmentId}</div>
                      </div>
                      <div className="text-xs text-right shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                        <div style={{ color: '#00e5ff' }}>{v.speed} <span style={{ color: 'var(--color-text-muted)' }}>km/h</span></div>
                        <div style={{ color: 'var(--color-text-muted)' }}>{v.heading}°</div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Telemetry */}
            <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                IoT TELEMETRY — {selectedPos?.vehicleId ?? '—'}
              </div>
              <TelemetryCard pos={selectedPos} />
            </div>

            {/* Event Timeline */}
            <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>EVENT TIMELINE</div>
              <div className="relative pl-4" style={{ borderLeft: '1px solid var(--color-border)' }}>
                {[...alerts.slice(0,3).map(a => ({
                  time: new Date(a.timestamp).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                  label: `${a.event}: ${a.fenceName}`,
                  color: a.severity === 'warning' ? '#ffab00' : '#00e5ff',
                })), ...DEMO_EVENTS].slice(0, 8).map((ev, i) => (
                  <div key={i} className="mb-3 relative">
                    <div className="absolute -left-[17px] w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? ev.color : 'var(--color-border)', border: '2px solid var(--color-surface)' }} />
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{ev.label}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{ev.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--color-border)' }}>
            <LiveMap positions={positions} trail={trail} selectedId={selectedId} />

            {/* Map overlay info */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
              <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(10,12,16,0.85)', border: '1px solid var(--color-border)', backdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#00e676' }} />
                  <span style={{ color: '#00e676', fontFamily: 'var(--font-mono)' }}>LIVE · {vehicleList.length} VEHICLES</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Trail: {trail.length} pts · Refresh: 2s
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 pointer-events-none">
              <div className="px-3 py-2 rounded-lg text-xs flex gap-4"
                style={{ background: 'rgba(10,12,16,0.85)', border: '1px solid var(--color-border)', backdropFilter: 'blur(8px)' }}>
                {[['#00e676', 'Moving'], ['#ffab00', 'Idle'], ['#ff1744', 'Engine Off']].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: '#00e5ff' }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>Trail</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEVICES TAB ───────────────────────────────────────────── */}
      {tab === 'devices' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>REGISTERED GPS DEVICES</span>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: '#16a34a', color: '#fff' }}>
              <Plus size={13} /> Register Device
            </button>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  {['Device ID','IMEI','Type','Vehicle','Shipment','Last Seen','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id:'DEV-001', imei:'356938035643809', type:'hardwired',    veh:'TN-09-AB-3421', shp:'SHP-2847', seen:'2s ago',   status:'Online'  },
                  { id:'DEV-002', imei:'356938035643810', type:'hardwired',    veh:'DL-01-CA-5892', shp:'SHP-2848', seen:'4s ago',   status:'Online'  },
                  { id:'DEV-003', imei:'356938035643811', type:'obd',          veh:'KA-05-MN-8823', shp:'SHP-2849', seen:'6s ago',   status:'Online'  },
                  { id:'DEV-004', imei:'356938035643812', type:'mobile',       veh:'MH-12-GH-4411', shp:'SHP-2850', seen:'8s ago',   status:'Online'  },
                  { id:'DEV-005', imei:'356938035643813', type:'asset_tracker',veh:'RJ-14-XY-9901', shp:'—',        seen:'2h ago',   status:'Offline' },
                ].map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: '#16a34a' }}>{d.id}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text-muted)' }}>{d.imei}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>{d.type}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{d.veh}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text-muted)' }}>{d.shp}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text-muted)' }}>{d.seen}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.status === 'Online' ? '#00e676' : '#ff1744' }} />
                        <span style={{ color: d.status === 'Online' ? '#00e676' : '#ff1744' }}>{d.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MQTT connection guide */}
          <div className="mt-4 rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid rgba(22,163,74,0.25)' }}>
            <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#16a34a' }}>GPS DEVICE CONNECTION GUIDE</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>MQTT (recommended for hardware trackers)</div>
                <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ background: 'var(--color-surface-2)', color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>{`Broker: mqtt://your-server:1883
Topic:  gps/{deviceId}/position

Payload (JSON):
{
  "lat": 19.0760, "lng": 72.8777,
  "speed": 62, "heading": 245,
  "alt": 14, "acc": 4.2,
  "temp": 24.1, "fuel": 78,
  "engine": true, "odo": 48234,
  "ts": 1712400000000
}`}</pre>
              </div>
              <div>
                <div className="font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>HTTP fallback (mobile / web SDK)</div>
                <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ background: 'var(--color-surface-2)', color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>{`POST /positions/ingest
Authorization: Bearer {token}

{
  "deviceId": "DEV-001",
  "shipmentId": "SHP-2847",
  "vehicleId": "TN-09-AB-3421",
  "lat": 19.0760, "lng": 72.8777,
  "speed": 62, "heading": 245
}

→ 201 { "ok": true, "id": "..." }`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GEOFENCES TAB ─────────────────────────────────────────── */}
      {tab === 'geofences' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>GEOFENCE ZONES</span>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: '#16a34a', color: '#fff' }}>
              <Plus size={13} /> Add Zone
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Mumbai Port Area',   type: 'circle',  radius: '2 km',    vehicles: 8,  alerts: 3  },
              { name: 'Delhi NCR Zone',     type: 'polygon', radius: '—',        vehicles: 12, alerts: 1  },
              { name: 'Chennai Warehouse',  type: 'circle',  radius: '500 m',   vehicles: 4,  alerts: 0  },
              { name: 'National Highway 48',type: 'polygon', radius: '—',        vehicles: 22, alerts: 7  },
              { name: 'Bangalore Tech Park',type: 'circle',  radius: '1.5 km',  vehicles: 3,  alerts: 0  },
              { name: 'Restricted Border',  type: 'circle',  radius: '10 km',   vehicles: 0,  alerts: 0  },
            ].map((f) => (
              <div key={f.name} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} style={{ color: '#16a34a' }} />
                    <span className="text-sm font-bold">{f.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>{f.type}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                  <div style={{ color: 'var(--color-text-muted)' }}>Radius: <span style={{ color: 'var(--color-text)' }}>{f.radius}</span></div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Vehicles: <span style={{ color: '#00e5ff' }}>{f.vehicles}</span></div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Alerts: <span style={{ color: f.alerts > 0 ? '#ffab00' : 'var(--color-text-muted)' }}>{f.alerts}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Play size={32} className="mx-auto mb-3" style={{ color: '#16a34a' }} />
          <h2 className="font-bold text-lg mb-2">History Playback</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Replay GPS trails at 1×, 5×, 10× or 60× speed.<br />
            Query <code className="px-1 rounded" style={{ background: 'var(--color-surface-2)', color: '#16a34a' }}>GET /positions/history/:shipmentId?from=&to=</code>
          </p>
          <div className="flex gap-3 justify-center">
            {['1×','5×','10×','60×'].map(s => (
              <button key={s} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
