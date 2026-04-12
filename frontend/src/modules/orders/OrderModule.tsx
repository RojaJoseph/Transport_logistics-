import { useState } from 'react';
import { ShoppingCart, Clock, CheckCircle2, XCircle, Truck, Search, Plus, ChevronRight, Package } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const ORDERS = [
  { id:'ORD-19283', customer:'Tata Motors',     origin:'Mumbai',    dest:'Delhi',     items:42,  value:824000,  status:'Confirmed',   sla:'2025-04-09', priority:'express' },
  { id:'ORD-19284', customer:'Reliance Retail', origin:'Bangalore', dest:'Chennai',   items:8,   value:144500,  status:'In Transit',  sla:'2025-04-08', priority:'standard'},
  { id:'ORD-19285', customer:'Infosys',         origin:'Pune',      dest:'Hyderabad', items:15,  value:320000,  status:'Pending',     sla:'2025-04-10', priority:'standard'},
  { id:'ORD-19286', customer:'HCL Technologies',origin:'Kolkata',   dest:'Ahmedabad', items:200, value:2250000, status:'Delivered',   sla:'2025-04-06', priority:'economy' },
  { id:'ORD-19287', customer:'Wipro Ltd',       origin:'Chennai',   dest:'Surat',     items:5,   value:68500,   status:'Cancelled',   sla:'2025-04-07', priority:'standard'},
  { id:'ORD-19288', customer:'L&T Logistics',   origin:'Delhi',     dest:'Bangalore', items:88,  value:1560000, status:'Confirmed',   sla:'2025-04-11', priority:'express' },
];

const sCfg: Record<string,{color:string;bg:string;icon:any}> = {
  Confirmed:   { color:'#00d4ff', bg:'rgba(0,212,255,0.08)',   icon:CheckCircle2 },
  'In Transit':{ color:'#2563eb', bg:'rgba(37,99,235,0.08)',   icon:Truck        },
  Pending:     { color:'#f59e0b', bg:'rgba(245,158,11,0.08)',  icon:Clock        },
  Delivered:   { color:'#10b981', bg:'rgba(16,185,129,0.08)',  icon:CheckCircle2 },
  Cancelled:   { color:'#ef4444', bg:'rgba(239,68,68,0.08)',   icon:XCircle      },
};

const prioColor: Record<string,string> = { express:'#ef4444', standard:'#00d4ff', economy:'#10b981' };

const PIPELINE = [
  { stage:'NEW',       count:24,  color:'#7c3aed' },
  { stage:'CONFIRMED', count:187, color:'#00d4ff' },
  { stage:'IN TRANSIT',count:312, color:'#2563eb' },
  { stage:'DELIVERED', count:724, color:'#10b981' },
];

export default function OrderModule() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<typeof ORDERS[0]|null>(null);

  const filtered = ORDERS.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="orders"
        icon="🛒"
        title="Order Management"
        subtitle="LIFECYCLE ENGINE"
        color="#06b6d4"
        description="Full order lifecycle from creation to delivery. Create orders, confirm, dispatch, track in real-time and auto-generate invoices. SLA tracking with automated alerts."
        features={['Order creation & validation','Pipeline stage management','SLA date tracking','Priority-based routing','Auto shipment linking','Status history timeline','Customer order portal','Invoice auto-generation']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Order Management <span style={{ color:'#06b6d4' }}>Lifecycle Engine</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Create · Confirm · Dispatch · Track · Deliver · Invoice
        </p>

        {/* Pipeline visual */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
          {PIPELINE.map((p,i) => (
            <div key={p.stage} style={{ position:'relative' }}>
              <div style={{
                padding:'14px 16px', borderRadius:12,
                background:`${p.color}08`,
                border:`1px solid ${p.color}25`,
              }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:p.color, fontFamily:'var(--font-mono)', marginBottom:6 }}>{p.stage}</div>
                <div style={{ fontSize:28, fontWeight:800, color:p.color, fontFamily:'var(--font-mono)' }}>{p.count}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>orders</div>
              </div>
              {i < PIPELINE.length-1 && (
                <div style={{ position:'absolute', right:-12, top:'50%', transform:'translateY(-50%)', zIndex:1 }}>
                  <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, maxWidth:320 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order / customer…"
              style={{ width:'100%', paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8,
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:8, color:'var(--text-primary)', fontSize:12, outline:'none', boxSizing:'border-box' }} />
          </div>
          <ActionModal title="Create New Order" color="#06b6d4" trigger={
            <button className="btn btn-primary btn-sm" style={{ background:'linear-gradient(135deg,#06b6d4,#0891b2)', gap:6 }}>
              <Plus size={13}/> New Order
            </button>
          }>
            <FormInput label="Customer Name" placeholder="e.g. Tata Motors Ltd" value="" onChange={()=>{}} />
            <FormInput label="Origin City" placeholder="e.g. Mumbai" value="" onChange={()=>{}} />
            <FormInput label="Destination City" placeholder="e.g. Delhi" value="" onChange={()=>{}} />
            <FormInput label="Total Items" type="number" placeholder="e.g. 42" value="" onChange={()=>{}} />
            <FormInput label="Order Value (₹)" type="number" placeholder="e.g. 824000" value="" onChange={()=>{}} />
            <FormSelect label="Priority" options={['economy','standard','express']} value="standard" onChange={()=>{}} />
            <FormInput label="SLA Date" type="date" value="" onChange={()=>{}} />
            <SubmitBtn label="Create Order" color="#06b6d4" onClick={()=>{}} />
          </ActionModal>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:12, padding:'12px 20px 20px' }}>
        {/* Order cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(o => {
            const cfg = sCfg[o.status];
            const Icon = cfg.icon;
            const isSel = selected?.id === o.id;
            return (
              <div key={o.id} onClick={()=>setSelected(o)} style={{
                padding:'16px', borderRadius:12, cursor:'pointer',
                background:'rgba(12,18,32,0.85)',
                border:`1px solid ${isSel ? '#06b6d4':'rgba(255,255,255,0.06)'}`,
                transition:'all 0.18s',
                boxShadow: isSel ? '0 0 0 1px #06b6d440' : 'none',
              }}
                onMouseEnter={e=>{ if(!isSel)(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.12)'; }}
                onMouseLeave={e=>{ if(!isSel)(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* Status icon */}
                  <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={16} color={cfg.color} />
                  </div>
                  {/* Order info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#06b6d4', fontFamily:'var(--font-mono)' }}>{o.id}</span>
                      <span style={{ padding:'2px 8px', borderRadius:99, fontSize:9, fontWeight:700, background:`${prioColor[o.priority]}18`, color:prioColor[o.priority] }}>
                        {o.priority.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginTop:2 }}>{o.customer}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{o.origin} → {o.dest}</div>
                  </div>
                  {/* Metrics */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'#10b981', fontFamily:'var(--font-mono)' }}>₹{(o.value/100000).toFixed(1)}L</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{o.items} items</div>
                    <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color, display:'inline-block', marginTop:4 }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ borderRadius:14, border:'1px solid rgba(255,255,255,0.06)', background:'rgba(12,18,32,0.85)', overflow:'hidden', height:'fit-content', position:'sticky', top:0 }}>
          {selected ? (
            <>
              <div style={{ padding:'14px 16px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>ORDER DETAIL</div>
              </div>
              <div style={{ padding:'16px' }}>
                <div style={{ display:'grid', gap:10, marginBottom:16 }}>
                  {[
                    ['Order ID',    selected.id,                    '#06b6d4'],
                    ['Customer',    selected.customer,              'var(--text-primary)'],
                    ['Route',       `${selected.origin} → ${selected.dest}`, 'var(--text-primary)'],
                    ['Items',       String(selected.items),         '#00d4ff'],
                    ['Value',       `₹${selected.value.toLocaleString('en-IN')}`, '#10b981'],
                    ['SLA Date',    selected.sla,                   'var(--text-secondary)'],
                    ['Priority',    selected.priority,              prioColor[selected.priority]],
                    ['Status',      selected.status,                sCfg[selected.status].color],
                  ].map(([k,v,c]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:String(c), fontFamily:k==='Order ID'?'var(--font-mono)':undefined, textAlign:'right', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gap:8 }}>
                  <ActionModal title={`Update ${selected.id}`} color="#06b6d4" trigger={
                    <button style={{ width:'100%', padding:'10px', background:'linear-gradient(135deg,#06b6d4,#0891b2)', border:'none', borderRadius:8, color:'#000', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      Edit Order
                    </button>
                  }>
                    <FormSelect label="Update Status" options={['Pending','Confirmed','In Transit','Delivered','Cancelled']} value={selected.status} onChange={()=>{}} />
                    <FormInput label="Note" placeholder="e.g. Customer confirmed delivery" value="" onChange={()=>{}} />
                    <SubmitBtn label="Update Status" color="#06b6d4" onClick={()=>{}} />
                  </ActionModal>
                  <button onClick={()=>setSelected(null)} style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Close
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <Package size={32} color="var(--text-muted)" style={{ marginBottom:12 }} />
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Click any order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
