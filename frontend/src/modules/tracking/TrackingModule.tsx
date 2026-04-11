import { useEffect, useRef, useState, useCallback } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import {
  MapPin, Thermometer, Zap, Navigation, Fuel, Satellite,
  AlertTriangle, Search, Plus, Activity, Gauge, RefreshCw,
  Radio, Clock, ChevronRight, Wifi, WifiOff, Settings
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
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

interface TrailPoint { lat: number; lng: number; }

const DEMO_VEHICLES = [
  { deviceId:'DEV-001', shipmentId:'SHP-2847', vehicleId:'TN-09-AB-3421', lat:19.076, lng:72.877, speed:75, heading:45,  temp:24.1, fuelPct:82, engineOn:true  },
  { deviceId:'DEV-002', shipmentId:'SHP-2848', vehicleId:'DL-01-CA-5892', lat:28.700, lng:77.100, speed:84, heading:135, temp:22.5, fuelPct:61, engineOn:true  },
  { deviceId:'DEV-003', shipmentId:'SHP-2849', vehicleId:'KA-05-MN-8823', lat:12.971, lng:77.594, speed:118,heading:270, temp:26.8, fuelPct:45, engineOn:true  },
  { deviceId:'DEV-004', shipmentId:'SHP-2850', vehicleId:'MH-12-GH-4411', lat:18.520, lng:73.856, speed:46, heading:90,  temp:23.2, fuelPct:78, engineOn:false },
];

const EVENTS = [
  { time:'14:32', label:'Position Updated',        color:'#00d4ff' },
  { time:'14:28', label:'Geofence: Entered Pune City', color:'#f59e0b' },
  { time:'14:10', label:'Speed Alert: 98 km/h',    color:'#ef4444' },
  { time:'13:55', label:'Engine Restarted',         color:'#10b981' },
  { time:'12:40', label:'Fuel: 30% remaining',      color:'#f59e0b' },
  { time:'11:00', label:'Departed Mumbai',          color:'#7c3aed' },
];

// ── Leaflet Live Map ──────────────────────────────────────────────
function LiveMap({ positions, trail, selectedId, onSelect }: {
  positions: Map<string, LivePosition>;
  trail: TrailPoint[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const divRef  = useRef<HTMLDivElement>(null);
  const mapRef  = useRef<any>(null);
  const markRef = useRef<Map<string, any>>(new Map());
  const polyRef = useRef<any>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || !divRef.current) return;
    initRef.current = true;

    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link');
      l.id = 'lf-css'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }

    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => {
      const L = (window as any).L;
      if (!divRef.current) return;
      mapRef.current = L.map(divRef.current, { center:[20.59,78.96], zoom:5, zoomControl:true, attributionControl:false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(mapRef.current);
    };
    document.head.appendChild(s);
  }, []);

  // Update markers
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    positions.forEach((pos, id) => {
      const isSel = id === selectedId;
      const dotColor = !pos.engineOn ? '#ef4444' : pos.speed === 0 ? '#f59e0b' : '#10b981';
      const size = isSel ? 44 : 32;

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:${size}px;height:${size}px;cursor:pointer">
          <div style="
            width:${size}px;height:${size}px;
            background:${dotColor}22;
            border:2px solid ${dotColor};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 ${isSel?20:10}px ${dotColor}88;
            transform:rotate(${pos.heading}deg);
            transition:all 0.4s;
          ">
            <svg width="${isSel?18:13}" height="${isSel?18:13}" viewBox="0 0 24 24" fill="${dotColor}">
              <path d="M12 2L4 20h16L12 2z"/>
            </svg>
          </div>
          ${isSel ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#0c1220;border:1px solid ${dotColor}44;color:${dotColor};padding:2px 8px;border-radius:4px;font-size:9px;white-space:nowrap;font-family:monospace;letter-spacing:0.05em">${pos.vehicleId}</div>` : ''}
          ${pos.speed > 0 ? `<div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);color:${dotColor};font-size:9px;font-family:monospace;white-space:nowrap">${pos.speed} km/h</div>` : ''}
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      });

      if (markRef.current.has(id)) {
        const m = markRef.current.get(id);
        m.setLatLng([pos.lat, pos.lng]);
        m.setIcon(icon);
      } else {
        const m = L.marker([pos.lat, pos.lng], { icon }).addTo(mapRef.current);
        m.on('click', () => onSelect(id));
        markRef.current.set(id, m);
      }
    });
  }, [positions, selectedId, onSelect]);

  // Trail polyline
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    if (trail.length < 2) return;
    polyRef.current = L.polyline(trail.map(p => [p.lat, p.lng]), {
      color:'#00d4ff', weight:2.5, opacity:0.6, dashArray:'8 5',
    }).addTo(mapRef.current);
  }, [trail]);

  return (
    <div ref={divRef} style={{ width:'100%', height:'100%', borderRadius:14, overflow:'hidden' }} />
  );
}

// ── Simulated GPS movement ────────────────────────────────────────
function useSimPositions() {
  const [positions, setPositions] = useState<Map<string, LivePosition>>(() => {
    const m = new Map<string, LivePosition>();
    DEMO_VEHICLES.forEach(v => m.set(v.deviceId, { ...v, ts: new Date().toISOString() }));
    return m;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setPositions(prev => {
        const next = new Map(prev);
        next.forEach((pos, key) => {
          const rad = pos.heading * Math.PI / 180;
          const step = (pos.speed / 3600) * 2.5 * 0.009;
          const headDrift = (Math.random() - 0.5) * 15;
          next.set(key, {
            ...pos,
            lat:     Math.round((pos.lat + Math.cos(rad) * step) * 1e5) / 1e5,
            lng:     Math.round((pos.lng + Math.sin(rad) * step) * 1e5) / 1e5,
            heading: (pos.heading + headDrift + 360) % 360,
            speed:   Math.max(20, Math.min(130, pos.speed + (Math.random()-0.5)*8)),
            fuelPct: Math.max(5, (pos.fuelPct ?? 80) - 0.03),
            ts:      new Date().toISOString(),
          });
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return positions;
}

// ── Stat pill ─────────────────────────────────────────────────────
function Pill({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.04)',
      border:`1px solid ${color}25`,
      borderRadius:8,
      padding:'8px 14px',
      display:'flex', flexDirection:'column', gap:2,
      minWidth:80,
    }}>
      <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em' }}>{label}</span>
      <span style={{ fontSize:14, fontWeight:700, color, fontFamily:'var(--font-mono)' }}>{value}</span>
    </div>
  );
}

// ── Telemetry row ─────────────────────────────────────────────────
function TRow({ icon: Icon, label, value, color }: { icon:any; label:string; value:string; color:string }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'7px 12px',
      borderRadius:8,
      background:'rgba(255,255,255,0.03)',
    }}>
      <Icon size={13} color={color} />
      <span style={{ fontSize:12, color:'var(--text-muted)', flex:1 }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'var(--font-mono)' }}>{value}</span>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────
const TABS = ['Live Map','Devices','Geofences','History'] as const;
type Tab = typeof TABS[number];

// ── Main Module ───────────────────────────────────────────────────
export default function TrackingModule() {
  const [tab, setTab]         = useState<Tab>('Live Map');
  const [selectedId, setSel]  = useState('DEV-001');
  const [query, setQuery]     = useState('');
  const [trail, setTrail]     = useState<TrailPoint[]>([]);
  const [wsStatus]            = useState<'demo'|'live'>('demo');

  const positions = useSimPositions();
  const selected  = positions.get(selectedId);

  // Build trail from selected vehicle
  useEffect(() => {
    if (!selected) return;
    setTrail(prev => [...prev.slice(-299), { lat: selected.lat, lng: selected.lng }]);
  }, [selected?.lat, selected?.lng]);

  const vehicleList = Array.from(positions.values()).filter(v =>
    !query ||
    v.vehicleId.toLowerCase().includes(query.toLowerCase()) ||
    v.shipmentId.toLowerCase().includes(query.toLowerCase())
  );

  const dotColor = (v: LivePosition) =>
    !v.engineOn ? '#ef4444' : v.speed === 0 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'calc(100vh - 56px)', overflow:'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px 12px',
        flexShrink:0,
      }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:0 }}>
            Live GPS Tracking{' '}
            <span style={{ color:'#10b981' }}>Custom</span>
          </h1>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, fontFamily:'var(--font-mono)' }}>
            MQTT · Socket.IO · MongoDB time-series · Geofencing
          </p>
        </div>

        {/* Stats pills row */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Pill label="DISTANCE"   value={`${(284.5).toFixed(1)} km`} color="#00d4ff" />
          <Pill label="AVG SPEED"  value="64 km/h"                     color="#7c3aed" />
          <Pill label="MAX SPEED"  value="98 km/h"                     color="#f97316" />
          <Pill label="IDLE TIME"  value="42 min"                      color="#f59e0b" />
          <Pill label="GPS POINTS" value={`${trail.length + 1200}`}    color="#10b981" />

          {/* WS badge */}
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'8px 12px', borderRadius:8,
            background: wsStatus==='live' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
            border:`1px solid ${wsStatus==='live' ? 'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'}`,
          }}>
            <div style={{
              width:6, height:6, borderRadius:'50%',
              background: wsStatus==='live' ? '#10b981':'#f59e0b',
              boxShadow:`0 0 6px ${wsStatus==='live'?'#10b981':'#f59e0b'}`,
              animation:'pulse-dot 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color: wsStatus==='live'?'#10b981':'#f59e0b', fontFamily:'var(--font-mono)' }}>
              {wsStatus==='live' ? 'WS LIVE':'DEMO MODE'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div style={{ padding:'0 20px 12px', flexShrink:0 }}>
        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t} className={`tab-item ${tab===t?'active':''}`}
              style={{ '--accent':tab===t?'#10b981':undefined } as any}
              onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIVE MAP TAB ─────────────────────────────────────────── */}
      {tab === 'Live Map' && (
        <div style={{
          display:'grid',
          gridTemplateColumns:'260px 1fr 260px',
          gap:12,
          padding:'0 20px 16px',
          flex:1,
          minHeight:0,
          overflow:'hidden',
        }}>

          {/* ── LEFT PANEL — Vehicle list ──────────────────────── */}
          <div style={{
            display:'flex', flexDirection:'column', gap:8,
            overflow:'hidden',
          }}>
            {/* Search */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
              <input
                value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search vehicle / shipment..."
                style={{
                  width:'100%', paddingLeft:30, paddingRight:10, paddingTop:8, paddingBottom:8,
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:8, color:'var(--text-primary)', fontSize:12, outline:'none',
                  fontFamily:'var(--font-sans)',
                }}
              />
            </div>

            {/* Label */}
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', flexShrink:0 }}>
              ACTIVE VEHICLES ({vehicleList.length})
            </div>

            {/* Vehicle cards */}
            <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:6, flex:1 }}>
              {vehicleList.map(v => {
                const isSel = v.deviceId === selectedId;
                const dc = dotColor(v);
                return (
                  <div
                    key={v.deviceId}
                    onClick={() => setSel(v.deviceId)}
                    style={{
                      padding:'10px 12px',
                      borderRadius:10,
                      background: isSel ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      border:`1px solid ${isSel ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      cursor:'pointer',
                      transition:'all 0.15s',
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:dc, flexShrink:0, boxShadow:`0 0 6px ${dc}` }} />
                      <span style={{ fontSize:12, fontWeight:700, color: isSel ? '#10b981' : 'var(--text-primary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-mono)' }}>
                        {v.vehicleId}
                      </span>
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--font-mono)' }}>
                      {v.shipmentId}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, color:'#00d4ff', fontFamily:'var(--font-mono)', fontWeight:600 }}>
                        {Math.round(v.speed)} km/h
                      </span>
                      <span style={{ fontSize:10, color: v.engineOn ? '#10b981':'#ef4444', fontFamily:'var(--font-mono)' }}>
                        {v.engineOn ? '⬤ ON' : '⬤ OFF'}
                      </span>
                    </div>
                    {/* Speed progress */}
                    <div style={{ marginTop:6, height:2, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100, v.speed/130*100)}%`, background:`linear-gradient(90deg, #10b981, #00d4ff)`, borderRadius:99, transition:'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MQTT guide compact */}
            <div style={{
              padding:'10px 12px',
              borderRadius:10,
              background:'rgba(16,185,129,0.04)',
              border:'1px solid rgba(16,185,129,0.12)',
              flexShrink:0,
            }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#10b981', marginBottom:6, fontFamily:'var(--font-mono)' }}>GPS DEVICE SETUP</div>
              <code style={{ fontSize:9, color:'rgba(0,212,255,0.8)', fontFamily:'var(--font-mono)', lineHeight:1.6, display:'block' }}>
                Topic: gps/&#123;deviceId&#125;/position<br/>
                Host: mqtt://localhost:1883
              </code>
            </div>
          </div>

          {/* ── CENTER — Map ───────────────────────────────────── */}
          <div style={{
            borderRadius:14,
            overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.06)',
            position:'relative',
            minHeight:0,
          }}>
            <LiveMap
              positions={positions}
              trail={trail}
              selectedId={selectedId}
              onSelect={setSel}
            />

            {/* Map overlay — top left */}
            <div style={{
              position:'absolute', top:12, left:12, zIndex:999,
              display:'flex', flexDirection:'column', gap:6,
              pointerEvents:'none',
            }}>
              <div style={{
                padding:'7px 12px', borderRadius:8,
                background:'rgba(8,13,20,0.9)', border:'1px solid rgba(255,255,255,0.08)',
                backdropFilter:'blur(12px)',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981', animation:'pulse-dot 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize:10, fontWeight:700, color:'#10b981', fontFamily:'var(--font-mono)', letterSpacing:'0.08em' }}>
                  LIVE · {vehicleList.length} VEHICLES
                </span>
              </div>
              <div style={{
                padding:'5px 10px', borderRadius:8,
                background:'rgba(8,13,20,0.85)', border:'1px solid rgba(255,255,255,0.06)',
                backdropFilter:'blur(12px)',
              }}>
                <span style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                  Trail: {trail.length} pts · Refresh: 2s
                </span>
              </div>
            </div>

            {/* Map legend — bottom */}
            <div style={{
              position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)',
              zIndex:999, pointerEvents:'none',
              padding:'6px 14px', borderRadius:99,
              background:'rgba(8,13,20,0.9)', border:'1px solid rgba(255,255,255,0.07)',
              backdropFilter:'blur(12px)',
              display:'flex', alignItems:'center', gap:16,
            }}>
              {[['#10b981','Moving'],['#f59e0b','Idle'],['#ef4444','Engine Off']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:c }} />
                  <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{l}</span>
                </div>
              ))}
              <div style={{ width:20, height:2, borderTop:'2px dashed #00d4ff', opacity:0.7 }} />
              <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>Trail</span>
            </div>
          </div>

          {/* ── RIGHT PANEL — Telemetry + Timeline ────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>

            {/* Vehicle header */}
            {selected && (
              <div style={{
                padding:'12px 14px',
                borderRadius:10,
                background:'rgba(16,185,129,0.06)',
                border:'1px solid rgba(16,185,129,0.15)',
                flexShrink:0,
              }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>SELECTED VEHICLE</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#10b981', fontFamily:'var(--font-mono)' }}>{selected.vehicleId}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, fontFamily:'var(--font-mono)' }}>{selected.shipmentId}</div>
              </div>
            )}

            {/* Telemetry */}
            <div style={{
              borderRadius:10,
              border:'1px solid rgba(255,255,255,0.06)',
              overflow:'hidden',
              flexShrink:0,
            }}>
              <div style={{
                padding:'10px 12px',
                background:'rgba(255,255,255,0.03)',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
                fontSize:10, fontWeight:700, letterSpacing:'0.1em',
                color:'var(--text-muted)', fontFamily:'var(--font-mono)',
              }}>
                IoT TELEMETRY
              </div>
              <div style={{ padding:'8px', display:'flex', flexDirection:'column', gap:4 }}>
                {selected ? <>
                  <TRow icon={Gauge}       label="Speed"       value={`${Math.round(selected.speed)} km/h`}                              color="#00d4ff" />
                  <TRow icon={Navigation}  label="Heading"     value={`${Math.round(selected.heading)}°`}                               color="#7c3aed" />
                  <TRow icon={Thermometer} label="Temperature" value={selected.temp!=null ? `${selected.temp.toFixed(1)}°C`:'—'}        color={selected.temp!=null&&selected.temp>30?'#ef4444':'#00d4ff'} />
                  <TRow icon={Fuel}        label="Fuel"        value={selected.fuelPct!=null ? `${Math.round(selected.fuelPct)}%`:'—'} color={(selected.fuelPct??100)<20?'#ef4444':'#10b981'} />
                  <TRow icon={Zap}         label="Engine"      value={selected.engineOn==null?'—':selected.engineOn?'ON':'OFF'}         color={selected.engineOn?'#10b981':'#ef4444'} />
                  <TRow icon={MapPin}      label="Position"    value={`${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}          color="#00d4ff" />
                </> : (
                  <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Select a vehicle</div>
                )}
              </div>
            </div>

            {/* Event timeline */}
            <div style={{
              borderRadius:10,
              border:'1px solid rgba(255,255,255,0.06)',
              overflow:'hidden',
              flex:1,
              minHeight:0,
              display:'flex', flexDirection:'column',
            }}>
              <div style={{
                padding:'10px 12px',
                background:'rgba(255,255,255,0.03)',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
                fontSize:10, fontWeight:700, letterSpacing:'0.1em',
                color:'var(--text-muted)', fontFamily:'var(--font-mono)',
                flexShrink:0,
              }}>
                EVENT TIMELINE
              </div>
              <div style={{ padding:'12px', overflowY:'auto', flex:1, position:'relative', paddingLeft:24 }}>
                <div style={{ position:'absolute', left:18, top:12, bottom:12, width:1, background:'rgba(255,255,255,0.06)' }} />
                {EVENTS.map((ev, i) => (
                  <div key={i} style={{ marginBottom:14, position:'relative' }}>
                    <div style={{
                      position:'absolute', left:-12, top:3,
                      width:8, height:8, borderRadius:'50%',
                      background: i===0 ? ev.color : 'rgba(255,255,255,0.1)',
                      border:`1px solid ${i===0?ev.color:'rgba(255,255,255,0.15)'}`,
                      boxShadow: i===0 ? `0 0 6px ${ev.color}` : 'none',
                    }} />
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', lineHeight:1.3 }}>{ev.label}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>{ev.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEVICES TAB ─────────────────────────────────────────── */}
      {tab === 'Devices' && (
        <div style={{ padding:'0 20px 16px', flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
              REGISTERED GPS DEVICES
            </span>
            <button className="btn btn-primary btn-sm" style={{ gap:6 }}>
              <Plus size={12} /> Register Device
            </button>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  {['Device ID','IMEI','Type','Vehicle','Shipment','Last Seen','Status'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id:'DEV-001', imei:'356938035643809', type:'hardwired',    veh:'TN-09-AB-3421', shp:'SHP-2847', seen:'2s ago',   ok:true },
                  { id:'DEV-002', imei:'356938035643810', type:'hardwired',    veh:'DL-01-CA-5892', shp:'SHP-2848', seen:'4s ago',   ok:true },
                  { id:'DEV-003', imei:'356938035643811', type:'obd',          veh:'KA-05-MN-8823', shp:'SHP-2849', seen:'6s ago',   ok:true },
                  { id:'DEV-004', imei:'356938035643812', type:'mobile',       veh:'MH-12-GH-4411', shp:'SHP-2850', seen:'8s ago',   ok:true },
                  { id:'DEV-005', imei:'356938035643813', type:'asset_tracker',veh:'RJ-14-XY-9901', shp:'—',        seen:'2h ago',   ok:false},
                ].map(d => (
                  <tr key={d.id}>
                    <td style={{ color:'#10b981', fontFamily:'var(--font-mono)', fontWeight:700 }}>{d.id}</td>
                    <td style={{ fontFamily:'var(--font-mono)', color:'var(--text-secondary)', fontSize:11 }}>{d.imei}</td>
                    <td><span className="badge badge-accent" style={{ fontSize:10 }}>{d.type}</span></td>
                    <td style={{ fontWeight:600 }}>{d.veh}</td>
                    <td style={{ fontFamily:'var(--font-mono)', color:'var(--text-secondary)' }}>{d.shp}</td>
                    <td style={{ fontFamily:'var(--font-mono)', color:'var(--text-muted)', fontSize:11 }}>{d.seen}</td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background: d.ok?'#10b981':'#ef4444' }} />
                        <span style={{ color: d.ok?'#10b981':'#ef4444', fontSize:12, fontWeight:600 }}>
                          {d.ok?'Online':'Offline'}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Connection guide */}
          <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { title:'MQTT (Hardware Trackers)', code:`Broker: mqtt://your-server:1883\nTopic:  gps/{deviceId}/position\n\nPayload (JSON):\n{\n  "lat": 19.0760, "lng": 72.8777,\n  "speed": 62, "heading": 245,\n  "temp": 24.1, "fuel": 78,\n  "engine": true, "ts": 1712400000000\n}` },
              { title:'HTTP Fallback (Mobile SDK)', code:`POST /positions/ingest\nAuthorization: Bearer {token}\n\n{\n  "deviceId": "DEV-001",\n  "shipmentId": "SHP-2847",\n  "vehicleId": "TN-09-AB-3421",\n  "lat": 19.0760, "lng": 72.8777,\n  "speed": 62\n}\n\n→ 201 { "ok": true, "id": "..." }` },
            ].map(({ title, code }) => (
              <div key={title} style={{ padding:'14px', borderRadius:10, background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.12)' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#10b981', marginBottom:10, fontFamily:'var(--font-mono)' }}>{title}</div>
                <pre style={{ margin:0, fontSize:11, color:'rgba(0,212,255,0.85)', fontFamily:'var(--font-mono)', lineHeight:1.6, overflowX:'auto', whiteSpace:'pre' }}>{code}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GEOFENCES TAB ────────────────────────────────────────── */}
      {tab === 'Geofences' && (
        <div style={{ padding:'0 20px 16px', flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>GEOFENCE ZONES</span>
            <button className="btn btn-primary btn-sm"><Plus size={12}/> Add Zone</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { name:'Mumbai Port Area',    type:'circle',  radius:'2 km',    vehicles:8,  alerts:3  },
              { name:'Delhi NCR Zone',      type:'polygon', radius:'—',        vehicles:12, alerts:1  },
              { name:'Chennai Warehouse',   type:'circle',  radius:'500 m',   vehicles:4,  alerts:0  },
              { name:'National Highway 48', type:'polygon', radius:'—',        vehicles:22, alerts:7  },
              { name:'Bangalore Tech Park', type:'circle',  radius:'1.5 km',  vehicles:3,  alerts:0  },
              { name:'Restricted Border',   type:'circle',  radius:'10 km',   vehicles:0,  alerts:0  },
            ].map(f => (
              <div key={f.name} style={{ padding:'14px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <MapPin size={13} color="#10b981"/>
                    <span style={{ fontSize:13, fontWeight:700 }}>{f.name}</span>
                  </div>
                  <span className="badge badge-accent" style={{ fontSize:9 }}>{f.type}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[['Radius',f.radius,'var(--text-primary)'],['Vehicles',f.vehicles,'#00d4ff'],['Alerts',f.alerts,f.alerts>0?'#f59e0b':'var(--text-muted)']].map(([l,v,c])=>(
                    <div key={String(l)}>
                      <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:String(c) }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────── */}
      {tab === 'History' && (
        <div style={{ padding:'0 20px 16px', flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <Clock size={40} color="var(--text-muted)" style={{ marginBottom:16 }} />
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>History Playback</h2>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:20 }}>
              Replay GPS trails at 1×, 5×, 10× or 60× speed
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              {['1×','5×','10×','60×'].map(s => (
                <button key={s} className="btn btn-secondary">{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
