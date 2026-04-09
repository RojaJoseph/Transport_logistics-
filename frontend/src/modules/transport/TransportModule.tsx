import { Routes, Route } from 'react-router-dom';
import { Truck, Route as RouteIcon, Calendar, AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

const SHIPMENTS = [
  { id: 'SHP-2847', origin: 'Mumbai',    dest: 'Delhi',     carrier: 'BlueDart',    mode: 'Air',  eta: '2h 15m', status: 'In Transit', progress: 72 },
  { id: 'SHP-2848', origin: 'Chennai',   dest: 'Kolkata',   carrier: 'DTDC',        mode: 'Road', eta: '18h 40m',status: 'In Transit', progress: 38 },
  { id: 'SHP-2849', origin: 'Bangalore', dest: 'Pune',      carrier: 'Gati',        mode: 'Road', eta: '—',      status: 'Delayed',    progress: 55 },
  { id: 'SHP-2850', origin: 'Delhi',     dest: 'Hyderabad', carrier: 'FedEx',       mode: 'Air',  eta: '4h 00m', status: 'In Transit', progress: 20 },
  { id: 'SHP-2851', origin: 'Surat',     dest: 'Jaipur',    carrier: 'Ecom Express',mode: 'Road', eta: '—',      status: 'Delivered',  progress: 100 },
  { id: 'SHP-2852', origin: 'Pune',      dest: 'Chennai',   carrier: 'Delhivery',   mode: 'Rail', eta: '8h 20m', status: 'In Transit', progress: 61 },
];

const statusConfig: Record<string, { color: string; icon: any }> = {
  'In Transit': { color: '#00e5ff', icon: Truck },
  'Delayed':    { color: '#ff1744', icon: AlertOctagon },
  'Delivered':  { color: '#00e676', icon: CheckCircle2 },
};

const modeColor: Record<string, string> = {
  Air: '#7c3aed', Road: '#00e5ff', Rail: '#ff6b2b', Sea: '#059669',
};

function ShipmentList() {
  return (
    <div className="space-y-3">
      {SHIPMENTS.map((s) => {
        const { color, icon: Icon } = statusConfig[s.status];
        return (
          <div key={s.id} className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-2 rounded-lg" style={{ background: `rgba(${hexToRgb(color)},0.12)` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-[90px]">
              <div className="text-xs font-bold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{s.id}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.carrier}</div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{s.origin} → {s.dest}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `rgba(${hexToRgb(modeColor[s.mode])},0.15)`, color: modeColor[s.mode] }}>{s.mode}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ETA: <strong style={{ color: 'var(--color-text)' }}>{s.eta}</strong></span>
              </div>
            </div>
            <div className="w-40">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                <span style={{ color, fontFamily: 'var(--font-mono)' }}>{s.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${s.progress}%`, background: color }} />
              </div>
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `rgba(${hexToRgb(color)},0.12)`, color }}>{s.status}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function TransportModule() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Transport Management <span style={{ color: '#2563eb' }}>SAP TM</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Shipment planning · Carrier management · Route optimisation</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Shipments', value: '4,821', color: '#00e5ff' },
          { label: 'In Transit',       value: '3,204', color: '#2563eb' },
          { label: 'Delayed',          value: '218',   color: '#ff1744' },
          { label: 'Delivered Today',  value: '1,399', color: '#00e676' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{label.toUpperCase()}</div>
            <div className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="mb-3 text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>LIVE SHIPMENTS</div>
      <Routes>
        <Route index element={<ShipmentList />} />
      </Routes>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}`;
}
