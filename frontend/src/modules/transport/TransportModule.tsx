import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Truck, CheckCircle2, AlertOctagon, Clock, Plus, Filter, MapPin } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const SHIPMENTS = [
  { id:'SHP-2847', origin:'Mumbai',    dest:'Delhi',     carrier:'BlueDart',     mode:'Air',  eta:'2h 15m', status:'In Transit', progress:72, temp:24.1, fuel:82 },
  { id:'SHP-2848', origin:'Chennai',   dest:'Kolkata',   carrier:'DTDC',         mode:'Road', eta:'18h 40m',status:'In Transit', progress:38, temp:22.0, fuel:61 },
  { id:'SHP-2849', origin:'Bangalore', dest:'Pune',      carrier:'Gati',         mode:'Road', eta:'—',      status:'Delayed',    progress:55, temp:26.8, fuel:45 },
  { id:'SHP-2850', origin:'Delhi',     dest:'Hyderabad', carrier:'FedEx',        mode:'Air',  eta:'4h 00m', status:'In Transit', progress:20, temp:23.0, fuel:78 },
  { id:'SHP-2851', origin:'Surat',     dest:'Jaipur',    carrier:'Ecom Express', mode:'Road', eta:'—',      status:'Delivered',  progress:100,temp:null, fuel:null },
  { id:'SHP-2852', origin:'Pune',      dest:'Chennai',   carrier:'Delhivery',    mode:'Rail', eta:'8h 20m', status:'In Transit', progress:61, temp:null, fuel:null },
];

const statusCfg: Record<string,{color:string;bg:string}> = {
  'In Transit': { color:'#00d4ff', bg:'rgba(0,212,255,0.08)' },
  'Delayed':    { color:'#ef4444', bg:'rgba(239,68,68,0.08)' },
  'Delivered':  { color:'#10b981', bg:'rgba(16,185,129,0.08)' },
};

const modeColor: Record<string,string> = { Air:'#7c3aed', Road:'#00d4ff', Rail:'#f97316', Sea:'#10b981' };

function ShipmentCard({ s }: { s: typeof SHIPMENTS[0] }) {
  const cfg = statusCfg[s.status];
  return (
    <ActionModal title={`Shipment ${s.id}`} color={cfg.color} trigger={
      <div style={{
        padding:'16px', borderRadius:14,
        background:'rgba(12,18,32,0.85)',
        border:`1px solid ${cfg.color}20`,
        cursor:'pointer', transition:'all 0.18s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}45`; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}20`; (e.currentTarget as HTMLElement).style.transform='translateY(0)'; }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:800, color:cfg.color, fontFamily:'var(--font-mono)' }}>{s.id}</div>
          <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color }}>
            {s.status}
          </span>
        </div>

        {/* Route */}
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
              <span style={{ padding:'2px 6px', borderRadius:4, fontSize:9, fontWeight:700, background:`${modeColor[s.mode]}18`, color:modeColor[s.mode] }}>{s.mode}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Progress</span>
            <span style={{ fontSize:11, fontWeight:700, color:cfg.color, fontFamily:'var(--font-mono)' }}>ETA: {s.eta}</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${s.progress}%`, background:`linear-gradient(90deg,${cfg.color},${cfg.color}bb)`, borderRadius:99, transition:'width 0.6s', boxShadow:`0 0 8px ${cfg.color}60` }} />
          </div>
          <div style={{ textAlign:'right', fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--font-mono)' }}>{s.progress}%</div>
        </div>

        {/* Telemetry chips */}
        {(s.temp != null || s.fuel != null) && (
          <div style={{ display:'flex', gap:6 }}>
            {s.temp != null && (
              <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, background:'rgba(0,212,255,0.08)', color:'#00d4ff', fontFamily:'var(--font-mono)' }}>
                🌡 {s.temp}°C
              </span>
            )}
            {s.fuel != null && (
              <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, background:`rgba(${s.fuel<30?'239,68,68':'16,185,129'},0.08)`, color:s.fuel<30?'#ef4444':'#10b981', fontFamily:'var(--font-mono)' }}>
                ⛽ {s.fuel}%
              </span>
            )}
          </div>
        )}
      </div>
    }>
      {/* Modal detail */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {[
          ['Shipment ID', s.id],['Status', s.status],['Carrier', s.carrier],
          ['Mode', s.mode],['Origin', s.origin],['Destination', s.dest],
          ['ETA', s.eta],['Progress', `${s.progress}%`],
        ].map(([k,v])=>(
          <div key={k} style={{ padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{k}</div>
            <div style={{ fontSize:13, fontWeight:700, color: k==='Status'?cfg.color:'var(--text-primary)' }}>{v}</div>
          </div>
        ))}
      </div>
      <FormSelect label="Update Status" options={['In Transit','Delayed','Delivered','Cancelled']} value={s.status} onChange={()=>{}} />
      <SubmitBtn label="Update Shipment" color={cfg.color} onClick={()=>{}} />
    </ActionModal>
  );
}

function ShipmentList() {
  const [filter, setFilter] = useState('All');
  const modes = ['All','Air','Road','Rail','Sea'];
  const filtered = filter==='All' ? SHIPMENTS : SHIPMENTS.filter(s=>s.mode===filter);

  return (
    <div style={{ padding:'0 20px 20px' }}>
      {/* Filter pills */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {modes.map(m => (
          <button key={m} onClick={()=>setFilter(m)} style={{
            padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
            border:`1px solid ${filter===m?(modeColor[m]||'#00d4ff')+'50':'rgba(255,255,255,0.08)'}`,
            background: filter===m ? `${modeColor[m]||'#00d4ff'}15` : 'transparent',
            color: filter===m ? (modeColor[m]||'#00d4ff') : 'var(--text-muted)',
            transition:'all 0.15s',
          }}>{m}</button>
        ))}
        <ActionModal title="Create Shipment" color="#2563eb" trigger={
          <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', gap:6 }}>
            <Plus size={13}/> New Shipment
          </button>
        }>
          <FormInput label="Carrier Name" placeholder="e.g. BlueDart" value="" onChange={()=>{}} />
          <FormSelect label="Transport Mode" options={['Air','Road','Rail','Sea']} value="Road" onChange={()=>{}} />
          <FormInput label="Origin City" placeholder="e.g. Mumbai" value="" onChange={()=>{}} />
          <FormInput label="Destination City" placeholder="e.g. Delhi" value="" onChange={()=>{}} />
          <FormInput label="AWB / Tracking Number" placeholder="e.g. BDE123456789" value="" onChange={()=>{}} />
          <FormInput label="ETA" type="datetime-local" value="" onChange={()=>{}} />
          <SubmitBtn label="Create Shipment" color="#2563eb" onClick={()=>{}} />
        </ActionModal>
      </div>

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {filtered.map(s => <ShipmentCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}

export default function TransportModule() {
  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="transport"
        icon="🚛"
        title="Transport Management"
        subtitle="SAP TM EQUIVALENT"
        color="#2563eb"
        description="Plan, dispatch and monitor all your shipments across Road, Rail, Air and Sea. Real-time carrier tracking, SLA monitoring and route optimisation powered by AI."
        features={['Live shipment tracking','Multi-modal carrier management','SLA & ETA monitoring','Route optimisation','Carrier performance scoring','Automated delay alerts','Freight cost management','AWB generation']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Transport Management <span style={{ color:'#2563eb' }}>SAP TM</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Shipment planning · Carrier management · Route optimisation
        </p>

        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:0 }}>
          {[
            { label:'ACTIVE SHIPMENTS', value:'4,821', color:'#00d4ff' },
            { label:'IN TRANSIT',       value:'3,204', color:'#2563eb' },
            { label:'DELAYED',          value:'218',   color:'#ef4444' },
            { label:'DELIVERED TODAY',  value:'1,399', color:'#10b981' },
          ].map(k => (
            <div key={k.label} style={{
              padding:'14px 16px', borderRadius:12,
              background:`${k.color}08`,
              border:`1px solid ${k.color}20`,
            }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'var(--font-mono)' }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px 4px', fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
        LIVE SHIPMENTS — Click any card for details
      </div>

      <Routes>
        <Route index element={<ShipmentList />} />
      </Routes>
    </div>
  );
}
