import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Plus, MapPin } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';
import toast from 'react-hot-toast';

// ── Type ──────────────────────────────────────────────────────────
interface Shipment {
  id: string; origin: string; dest: string; carrier: string;
  mode: string; eta: string; status: string; progress: number;
  temp: number | null; fuel: number | null;
}

// ── Seed data ─────────────────────────────────────────────────────
const SEED: Shipment[] = [
  { id:'SHP-2847', origin:'Mumbai',    dest:'Delhi',     carrier:'BlueDart',     mode:'Air',  eta:'2h 15m',  status:'In Transit', progress:72,  temp:24.1, fuel:82   },
  { id:'SHP-2848', origin:'Chennai',   dest:'Kolkata',   carrier:'DTDC',         mode:'Road', eta:'18h 40m', status:'In Transit', progress:38,  temp:22.0, fuel:61   },
  { id:'SHP-2849', origin:'Bangalore', dest:'Pune',      carrier:'Gati',         mode:'Road', eta:'—',       status:'Delayed',    progress:55,  temp:26.8, fuel:45   },
  { id:'SHP-2850', origin:'Delhi',     dest:'Hyderabad', carrier:'FedEx',        mode:'Air',  eta:'4h 00m',  status:'In Transit', progress:20,  temp:23.0, fuel:78   },
  { id:'SHP-2851', origin:'Surat',     dest:'Jaipur',    carrier:'Ecom Express', mode:'Road', eta:'—',       status:'Delivered',  progress:100, temp:null, fuel:null },
  { id:'SHP-2852', origin:'Pune',      dest:'Chennai',   carrier:'Delhivery',    mode:'Rail', eta:'8h 20m',  status:'In Transit', progress:61,  temp:null, fuel:null },
];

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  'In Transit': { color:'#00d4ff', bg:'rgba(0,212,255,0.08)'   },
  Delayed:      { color:'#ef4444', bg:'rgba(239,68,68,0.08)'   },
  Delivered:    { color:'#10b981', bg:'rgba(16,185,129,0.08)'  },
  Cancelled:    { color:'#9ca3af', bg:'rgba(156,163,175,0.08)' },
};
const MODE_COLOR: Record<string, string> = { Air:'#7c3aed', Road:'#00d4ff', Rail:'#f97316', Sea:'#10b981' };

let counter = 2853;
const nextId = () => `SHP-${counter++}`;

// ── Shipment card ─────────────────────────────────────────────────
function ShipmentCard({
  s, onUpdate,
}: {
  s: Shipment;
  onUpdate: (id: string, status: string) => void;
}) {
  const cfg        = STATUS_CFG[s.status] ?? { color:'#888', bg:'rgba(136,136,136,0.08)' };
  const [st, setSt] = useState(s.status);

  return (
    <ActionModal title={`Shipment ${s.id}`} color={cfg.color} trigger={
      <div style={{
        padding:'16px', borderRadius:14,
        background:'rgba(12,18,32,0.85)',
        border:`1px solid ${cfg.color}20`,
        cursor:'pointer', transition:'all 0.18s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}45`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}20`; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:800, color:cfg.color, fontFamily:'var(--font-mono)' }}>{s.id}</div>
          <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color }}>{s.status}</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color }} />
            <div style={{ width:1, height:20, background:'rgba(255,255,255,0.1)', margin:'3px 0' }} />
            <MapPin size={10} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{s.origin}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>→</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{s.dest}</div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>Carrier</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>{s.carrier}</div>
            <div style={{ marginTop:4 }}>
              <span style={{ padding:'2px 6px', borderRadius:4, fontSize:9, fontWeight:700, background:`${MODE_COLOR[s.mode] ?? '#888'}18`, color:MODE_COLOR[s.mode] ?? '#888' }}>{s.mode}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Progress</span>
            <span style={{ fontSize:11, fontWeight:700, color:cfg.color, fontFamily:'var(--font-mono)' }}>ETA: {s.eta}</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${s.progress}%`, background:`linear-gradient(90deg,${cfg.color},${cfg.color}bb)`, borderRadius:99, boxShadow:`0 0 8px ${cfg.color}60` }} />
          </div>
          <div style={{ textAlign:'right', fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--font-mono)' }}>{s.progress}%</div>
        </div>

        {(s.temp != null || s.fuel != null) && (
          <div style={{ display:'flex', gap:6 }}>
            {s.temp != null && (
              <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, background:'rgba(0,212,255,0.08)', color:'#00d4ff', fontFamily:'var(--font-mono)' }}>🌡 {s.temp}°C</span>
            )}
            {s.fuel != null && (
              <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, background:`rgba(${s.fuel < 30 ? '239,68,68' : '16,185,129'},0.08)`, color:s.fuel < 30 ? '#ef4444' : '#10b981', fontFamily:'var(--font-mono)' }}>⛽ {s.fuel}%</span>
            )}
          </div>
        )}
      </div>
    }>
      {/* Modal body */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {([
          ['Shipment ID', s.id], ['Status', s.status], ['Carrier', s.carrier],
          ['Mode', s.mode],      ['Origin', s.origin],  ['Destination', s.dest],
          ['ETA', s.eta],        ['Progress', `${s.progress}%`],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{k}</div>
            <div style={{ fontSize:13, fontWeight:700, color:k === 'Status' ? cfg.color : 'var(--text-primary)' }}>{v}</div>
          </div>
        ))}
      </div>
      <FormSelect
        label="Update Status"
        options={['In Transit', 'Delayed', 'Delivered', 'Cancelled']}
        value={st}
        onChange={v => setSt(v)}
      />
      <SubmitBtn label="Update Shipment" color={cfg.color} onClick={() => {
        onUpdate(s.id, st);
        toast.success(`${s.id} → ${st}`);
      }} />
    </ActionModal>
  );
}

// ── Shipment list ─────────────────────────────────────────────────
function ShipmentList({
  shipments, onAdd, onUpdate,
}: {
  shipments: Shipment[];
  onAdd:    (s: Shipment) => void;
  onUpdate: (id: string, status: string) => void;
}) {
  const [filter, setFilter] = useState('All');
  const [form,   setForm]   = useState({
    carrier:'', mode:'Road', origin:'', dest:'', awb:'', eta:'',
  });

  const filtered = filter === 'All' ? shipments : shipments.filter(s => s.mode === filter);

  const handleAdd = () => {
    if (!form.carrier || !form.origin || !form.dest) {
      toast.error('Carrier, origin and destination are required');
      return;
    }
    const newShip: Shipment = {
      id:       nextId(),
      carrier:  form.carrier,
      mode:     form.mode,
      origin:   form.origin,
      dest:     form.dest,
      eta:      form.eta || 'TBD',
      status:   'In Transit',
      progress: 0,
      temp:     null,
      fuel:     null,
    };
    onAdd(newShip);
    setForm({ carrier:'', mode:'Road', origin:'', dest:'', awb:'', eta:'' });
    toast.success(`Shipment ${newShip.id} created`);
  };

  return (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['All','Air','Road','Rail','Sea'].map(m => (
          <button key={m} onClick={() => setFilter(m)} style={{
            padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
            border:`1px solid ${filter === m ? (MODE_COLOR[m] || '#00d4ff') + '50' : 'rgba(255,255,255,0.08)'}`,
            background: filter === m ? `${MODE_COLOR[m] || '#00d4ff'}15` : 'transparent',
            color: filter === m ? (MODE_COLOR[m] || '#00d4ff') : 'var(--text-muted)',
            transition:'all 0.15s',
          }}>{m}</button>
        ))}
        <ActionModal title="Create Shipment" color="#2563eb" trigger={
          <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', gap:6 }}>
            <Plus size={13}/> New Shipment
          </button>
        }>
          <FormInput  label="Carrier Name"         placeholder="e.g. BlueDart"    value={form.carrier} onChange={v => setForm(p => ({ ...p, carrier:v }))} />
          <FormSelect label="Transport Mode"        options={['Air','Road','Rail','Sea']} value={form.mode} onChange={v => setForm(p => ({ ...p, mode:v }))} />
          <FormInput  label="Origin City"           placeholder="e.g. Mumbai"     value={form.origin}  onChange={v => setForm(p => ({ ...p, origin:v }))} />
          <FormInput  label="Destination City"      placeholder="e.g. Delhi"      value={form.dest}    onChange={v => setForm(p => ({ ...p, dest:v }))}   />
          <FormInput  label="AWB / Tracking Number" placeholder="e.g. BDE123456" value={form.awb}     onChange={v => setForm(p => ({ ...p, awb:v }))}    />
          <FormInput  label="ETA"                   type="datetime-local"          value={form.eta}     onChange={v => setForm(p => ({ ...p, eta:v }))}    />
          <SubmitBtn label="Create Shipment" color="#2563eb" onClick={handleAdd} />
        </ActionModal>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
          No shipments. Create one above ↑
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {filtered.map(s => (
          <ShipmentCard key={s.id} s={s} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────
export default function TransportModule() {
  const [shipments, setShipments] = useState<Shipment[]>(SEED);

  const handleAdd = (s: Shipment) =>
    setShipments(prev => [s, ...prev]);

  const handleUpdate = (id: string, status: string) =>
    setShipments(prev =>
      prev.map(s => s.id === id
        ? { ...s, status, progress: status === 'Delivered' ? 100 : s.progress }
        : s
      )
    );

  const counts = {
    active:    shipments.filter(s => s.status === 'In Transit').length,
    inTransit: shipments.filter(s => s.status === 'In Transit').length,
    delayed:   shipments.filter(s => s.status === 'Delayed').length,
    delivered: shipments.filter(s => s.status === 'Delivered').length,
  };

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="transport"
        icon="🚛"
        title="Transport Management"
        subtitle="SAP TM EQUIVALENT"
        color="#2563eb"
        description="Plan, dispatch and monitor all your shipments across Road, Rail, Air and Sea."
        features={['Live shipment tracking','Multi-modal carrier management','SLA & ETA monitoring','Route optimisation','Automated delay alerts','AWB generation']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Transport Management <span style={{ color:'#2563eb' }}>SAP TM</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Shipment planning · Carrier management · Route optimisation
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:0 }}>
          {[
            { label:'ACTIVE SHIPMENTS', value:shipments.length,   color:'#00d4ff' },
            { label:'IN TRANSIT',       value:counts.inTransit,   color:'#2563eb' },
            { label:'DELAYED',          value:counts.delayed,     color:'#ef4444' },
            { label:'DELIVERED',        value:counts.delivered,   color:'#10b981' },
          ].map(k => (
            <div key={k.label} style={{ padding:'14px 16px', borderRadius:12, background:`${k.color}08`, border:`1px solid ${k.color}20` }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'var(--font-mono)' }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px 4px', fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
        LIVE SHIPMENTS — Click any card to update
      </div>

      <Routes>
        <Route index element={<ShipmentList shipments={shipments} onAdd={handleAdd} onUpdate={handleUpdate} />} />
      </Routes>
    </div>
  );
}
