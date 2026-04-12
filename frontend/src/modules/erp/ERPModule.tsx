import { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Package2, Users, Warehouse, FileText, Settings2,
  Plus, Search, MoreVertical, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, ArrowRight, ShoppingCart,
  BarChart3, RefreshCw, Tag
} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const TABS = ['Overview','Inventory','Vendors','Warehouses','Documents','Configuration'];

function SubNav() {
  const loc = useLocation();
  return (
    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
      {TABS.map(t => {
        const path = `/erp${t==='Overview'?'':'/'+t.toLowerCase()}`;
        const active = t==='Overview' ? (loc.pathname==='/erp'||loc.pathname==='/erp/') : loc.pathname.startsWith(path);
        return (
          <NavLink key={t} to={path} end={t==='Overview'} style={{
            padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:600,
            textDecoration:'none', transition:'all 0.15s',
            background: active ? '#7c3aed' : 'rgba(255,255,255,0.04)',
            color: active ? '#fff' : 'var(--text-muted)',
            border:`1px solid ${active ? '#7c3aed50':'rgba(255,255,255,0.06)'}`,
            boxShadow: active ? '0 0 16px #7c3aed40' : 'none',
          }}>
            {t}
          </NavLink>
        );
      })}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon:Icon, trend }: any) {
  return (
    <div style={{
      padding:'18px 20px',
      background:'linear-gradient(135deg, rgba(12,18,32,0.9), rgba(8,13,20,0.95))',
      border:`1px solid ${color}20`,
      borderRadius:14,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:`linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ padding:'8px', borderRadius:10, background:`${color}15` }}>
          <Icon size={16} color={color} />
        </div>
        {trend != null && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color: trend>=0?'#10b981':'#ef4444' }}>
            {trend>=0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', color:'var(--text-primary)', letterSpacing:'-0.02em', marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:600, color, fontFamily:'var(--font-mono)', letterSpacing:'0.05em', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

// ── Quick Action Card (clickable) ─────────────────────────────────
function QuickAction({ icon, label, desc, color, modal }: any) {
  return (
    <ActionModal title={label} color={color} trigger={
      <div style={{
        padding:'16px', borderRadius:12, cursor:'pointer',
        background:'rgba(255,255,255,0.02)',
        border:'1px solid rgba(255,255,255,0.06)',
        transition:'all 0.18s',
        display:'flex', flexDirection:'column', gap:10,
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = `${color}0a`;
          (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ padding:'8px', borderRadius:10, background:`${color}15` }}>
            {icon}
          </div>
          <ArrowRight size={14} color={color} />
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>{label}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{desc}</div>
        </div>
      </div>
    }>
      {modal}
    </ActionModal>
  );
}

// ── Inventory table ───────────────────────────────────────────────
const INV_DATA = [
  { sku:'SKU-00123', name:'Palletized Cargo A',  qty:4200, unit:'Units',  warehouse:'Chennai Hub',  status:'In Stock',    value:'₹8,40,000',  pct:100 },
  { sku:'SKU-00124', name:'Cold Chain Pack B',   qty:850,  unit:'Cases',  warehouse:'Delhi Cold',   status:'Low Stock',   value:'₹2,12,500',  pct:62  },
  { sku:'SKU-00125', name:'Hazmat Drums C',       qty:0,    unit:'Drums',  warehouse:'Mumbai Port',  status:'Out of Stock',value:'₹0',          pct:0   },
  { sku:'SKU-00126', name:'Electronics Batch D', qty:1100, unit:'Boxes',  warehouse:'Bangalore DC', status:'In Stock',    value:'₹44,00,000', pct:88  },
  { sku:'SKU-00127', name:'Textile Roll E',       qty:320,  unit:'Rolls',  warehouse:'Surat Depot',  status:'In Stock',    value:'₹6,40,000',  pct:75  },
  { sku:'SKU-00128', name:'Auto Parts Kit F',     qty:60,   unit:'Sets',   warehouse:'Pune Plant',   status:'Low Stock',   value:'₹3,00,000',  pct:18  },
];

const statusStyle: Record<string,{bg:string;color:string}> = {
  'In Stock':     { bg:'rgba(16,185,129,0.1)',  color:'#10b981' },
  'Low Stock':    { bg:'rgba(245,158,11,0.1)',  color:'#f59e0b' },
  'Out of Stock': { bg:'rgba(239,68,68,0.1)',   color:'#ef4444' },
};

function InventoryPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newSku,  setNewSku]  = useState({ sku:'', name:'', qty:'', unit:'Units', cost:'' });

  const filtered = INV_DATA.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:'0 20px 20px' }}>
      {/* toolbar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
        <div style={{ position:'relative', flex:1, maxWidth:320 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SKU / product…"
            style={{ width:'100%', paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:8, color:'var(--text-primary)', fontSize:12, outline:'none', boxSizing:'border-box' }} />
        </div>
        <ActionModal title="Add Inventory Item" color="#7c3aed" trigger={
          <button className="btn btn-primary btn-sm" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', gap:6 }}>
            <Plus size={13}/> Add Item
          </button>
        }>
          <FormInput label="SKU" placeholder="e.g. SKU-00129" value={newSku.sku} onChange={v=>setNewSku(p=>({...p,sku:v}))} />
          <FormInput label="Product Name" placeholder="e.g. Electronics Batch E" value={newSku.name} onChange={v=>setNewSku(p=>({...p,name:v}))} />
          <FormInput label="Quantity" type="number" value={newSku.qty} onChange={v=>setNewSku(p=>({...p,qty:v}))} />
          <FormSelect label="Unit" options={['Units','Boxes','Cases','Drums','Rolls','Sets','Cartons']} value={newSku.unit} onChange={v=>setNewSku(p=>({...p,unit:v}))} />
          <FormInput label="Unit Cost (₹)" type="number" placeholder="e.g. 4000" value={newSku.cost} onChange={v=>setNewSku(p=>({...p,cost:v}))} />
          <SubmitBtn label="Add to Inventory" color="#7c3aed" onClick={()=>setNewSku({sku:'',name:'',qty:'',unit:'Units',cost:''})} />
        </ActionModal>
      </div>

      {/* cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
        {filtered.map(row => {
          const { bg, color } = statusStyle[row.status];
          return (
            <div key={row.sku} style={{
              padding:'16px', borderRadius:12,
              background:'rgba(12,18,32,0.8)',
              border:'1px solid rgba(255,255,255,0.06)',
              transition:'all 0.18s',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, color:'#7c3aed', fontFamily:'var(--font-mono)', fontWeight:700 }}>{row.sku}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginTop:2 }}>{row.name}</div>
                </div>
                <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:bg, color }}>{row.status}</span>
              </div>

              {/* Stock bar */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>Stock Level</span>
                  <span style={{ fontSize:11, fontWeight:700, color, fontFamily:'var(--font-mono)' }}>{row.qty.toLocaleString()} {row.unit}</span>
                </div>
                <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:99 }}>
                  <div style={{ height:'100%', width:`${row.pct}%`, background:color, borderRadius:99, transition:'width 0.6s' }} />
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>Warehouse</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)', fontWeight:500 }}>{row.warehouse}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>Value</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#10b981', fontFamily:'var(--font-mono)' }}>{row.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ERP Overview ──────────────────────────────────────────────────
function ERPOverview() {
  return (
    <div style={{ padding:'0 20px 20px' }}>
      {/* KPI grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        <KpiCard label="TOTAL SKUs"     value="12,480" sub="Across 5 warehouses" color="#7c3aed" icon={Package2}   trend={3.2}  />
        <KpiCard label="ACTIVE VENDORS" value="284"    sub="18 pending approval"  color="#00d4ff" icon={Users}      trend={1.8}  />
        <KpiCard label="WAREHOUSES"     value="18"     sub="78% capacity used"    color="#f97316" icon={Warehouse}  trend={null} />
        <KpiCard label="OPEN POs"       value="437"    sub="₹2.4Cr pending"       color="#10b981" icon={FileText}   trend={-2.1} />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
          QUICK ACTIONS — Click to open form
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          <QuickAction
            icon={<ShoppingCart size={16} color="#7c3aed"/>}
            label="Create Purchase Order" color="#7c3aed"
            desc="Raise a new PO to any vendor"
            modal={<>
              <FormSelect label="Vendor" options={['Tata Motors Ltd','Reliance Industries','Infosys Logistics','Mahindra & Mahindra']} value="Tata Motors Ltd" onChange={()=>{}} />
              <FormInput label="PO Value (₹)" type="number" placeholder="e.g. 500000" value="" onChange={()=>{}} />
              <FormInput label="Expected Delivery Date" type="date" value="" onChange={()=>{}} />
              <FormInput label="Notes" placeholder="Optional notes" value="" onChange={()=>{}} />
              <SubmitBtn label="Create Purchase Order" color="#7c3aed" onClick={()=>{}} />
            </>}
          />
          <QuickAction
            icon={<RefreshCw size={16} color="#00d4ff"/>}
            label="Stock Adjustment" color="#00d4ff"
            desc="Add or remove stock manually"
            modal={<>
              <FormInput label="SKU" placeholder="e.g. SKU-00123" value="" onChange={()=>{}} />
              <FormSelect label="Adjustment Type" options={['Add Stock','Remove Stock','Write-Off','Transfer']} value="Add Stock" onChange={()=>{}} />
              <FormInput label="Quantity" type="number" placeholder="e.g. 500" value="" onChange={()=>{}} />
              <FormInput label="Reason" placeholder="e.g. Purchase receipt" value="" onChange={()=>{}} />
              <SubmitBtn label="Apply Adjustment" color="#00d4ff" onClick={()=>{}} />
            </>}
          />
          <QuickAction
            icon={<Users size={16} color="#f97316"/>}
            label="Vendor Onboarding" color="#f97316"
            desc="Register a new vendor partner"
            modal={<>
              <FormInput label="Company Name" placeholder="e.g. Adani Logistics" value="" onChange={()=>{}} />
              <FormInput label="GSTIN" placeholder="27AABCX1234Y1Z5" value="" onChange={()=>{}} />
              <FormInput label="Contact Email" placeholder="vendor@company.com" value="" onChange={()=>{}} />
              <FormInput label="Phone" placeholder="+91-..." value="" onChange={()=>{}} />
              <FormSelect label="Payment Terms (days)" options={['15','30','45','60','90']} value="30" onChange={()=>{}} />
              <SubmitBtn label="Register Vendor" color="#f97316" onClick={()=>{}} />
            </>}
          />
          <QuickAction
            icon={<CheckCircle2 size={16} color="#10b981"/>}
            label="Generate GRN" color="#10b981"
            desc="Goods Receipt Note for inbound"
            modal={<>
              <FormInput label="PO Reference Number" placeholder="e.g. PO-1712400000000" value="" onChange={()=>{}} />
              <FormInput label="Received Quantity" type="number" placeholder="e.g. 500" value="" onChange={()=>{}} />
              <FormInput label="Received Date" type="date" value="" onChange={()=>{}} />
              <FormSelect label="Warehouse" options={['Mumbai Central Hub','Delhi NCR Distribution','Chennai Port Depot','Bangalore Tech DC']} value="Mumbai Central Hub" onChange={()=>{}} />
              <FormInput label="Inspector Name" placeholder="e.g. Ravi Kumar" value="" onChange={()=>{}} />
              <SubmitBtn label="Generate GRN" color="#10b981" onClick={()=>{}} />
            </>}
          />
          <QuickAction
            icon={<BarChart3 size={16} color="#f59e0b"/>}
            label="Cycle Count" color="#f59e0b"
            desc="Schedule inventory cycle count"
            modal={<>
              <FormSelect label="Warehouse" options={['Mumbai Central Hub','Delhi NCR Distribution','Chennai Port Depot','Bangalore Tech DC']} value="Mumbai Central Hub" onChange={()=>{}} />
              <FormInput label="Count Date" type="date" value="" onChange={()=>{}} />
              <FormSelect label="Count Type" options={['Full Count','ABC Analysis','Random Sample','Zone-Based']} value="Full Count" onChange={()=>{}} />
              <FormInput label="Assigned To" placeholder="e.g. Arjun Sharma" value="" onChange={()=>{}} />
              <SubmitBtn label="Schedule Cycle Count" color="#f59e0b" onClick={()=>{}} />
            </>}
          />
          <QuickAction
            icon={<Tag size={16} color="#8b5cf6"/>}
            label="Price Update" color="#8b5cf6"
            desc="Bulk update product pricing"
            modal={<>
              <FormInput label="SKU (or leave blank for all)" placeholder="e.g. SKU-00123" value="" onChange={()=>{}} />
              <FormSelect label="Update Method" options={['Fixed Price','% Increase','% Decrease','Cost + Margin']} value="% Increase" onChange={()=>{}} />
              <FormInput label="Value (%)" type="number" placeholder="e.g. 5" value="" onChange={()=>{}} />
              <FormInput label="Effective Date" type="date" value="" onChange={()=>{}} />
              <SubmitBtn label="Apply Price Update" color="#8b5cf6" onClick={()=>{}} />
            </>}
          />
        </div>
      </div>

      {/* Warehouse utilisation */}
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
        WAREHOUSE UTILISATION
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        {[
          { name:'Mumbai Central Hub', used:78, cap:'45,000 m²', type:'General', color:'#00d4ff' },
          { name:'Delhi NCR Dist.',    used:65, cap:'62,000 m²', type:'General', color:'#7c3aed' },
          { name:'Chennai Port',       used:91, cap:'38,000 m²', type:'Port',    color:'#ef4444' },
          { name:'Bangalore Tech DC',  used:54, cap:'28,000 m²', type:'General', color:'#10b981' },
          { name:'Delhi Cold Chain',   used:88, cap:'12,000 m²', type:'Cold',    color:'#f59e0b' },
        ].map(w => (
          <div key={w.name} style={{ padding:'14px', borderRadius:12, background:'rgba(12,18,32,0.8)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.05em', color:w.color, fontFamily:'var(--font-mono)', marginBottom:6 }}>{w.type.toUpperCase()}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:2, lineHeight:1.3 }}>{w.name}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:12 }}>{w.cap}</div>
            {/* Circular progress */}
            <div style={{ textAlign:'center', position:'relative' }}>
              <svg width={70} height={70} viewBox="0 0 70 70" style={{ display:'block', margin:'0 auto' }}>
                <circle cx={35} cy={35} r={28} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <circle cx={35} cy={35} r={28} fill="none" stroke={w.color} strokeWidth={6}
                  strokeDasharray={`${2*Math.PI*28}`}
                  strokeDashoffset={`${2*Math.PI*28*(1-w.used/100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 35 35)"
                  style={{ transition:'stroke-dashoffset 0.8s ease', filter:`drop-shadow(0 0 4px ${w.color})` }}
                />
                <text x={35} y={39} textAnchor="middle" fill={w.color} fontSize={13} fontWeight={700} fontFamily="monospace">{w.used}%</text>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VendorsPage() {
  const VENDORS = [
    { name:'Tata Motors Ltd',     gstin:'27AABCT1234F1ZV', city:'Mumbai',    terms:30, rating:4.5, status:'Active',   spend:'₹84L'  },
    { name:'Reliance Industries', gstin:'27AAACR1234G1ZX', city:'Mumbai',    terms:45, rating:4.2, status:'Active',   spend:'₹1.2Cr'},
    { name:'Infosys Logistics',   gstin:'29AABCI1234H1ZY', city:'Bangalore', terms:30, rating:4.7, status:'Active',   spend:'₹32L'  },
    { name:'Mahindra & Mahindra', gstin:'27AABCM1234I1ZW', city:'Pune',      terms:60, rating:4.3, status:'Active',   spend:'₹56L'  },
    { name:'Asian Paints Ltd',    gstin:'27AABCA1234J1ZV', city:'Mumbai',    terms:30, rating:3.9, status:'Review',   spend:'₹18L'  },
    { name:'HCL Technologies',    gstin:'29AABCH1234K1ZU', city:'Noida',     terms:30, rating:4.1, status:'Active',   spend:'₹44L'  },
  ];
  return (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {VENDORS.length} VENDORS
        </div>
        <ActionModal title="Add New Vendor" color="#00d4ff" trigger={
          <button className="btn btn-primary btn-sm" style={{ gap:6 }}><Plus size={13}/>Add Vendor</button>
        }>
          <FormInput label="Company Name" placeholder="e.g. HDFC Logistics" value="" onChange={()=>{}} />
          <FormInput label="GSTIN" placeholder="27AABCX1234Y1Z5" value="" onChange={()=>{}} />
          <FormInput label="Contact Email" placeholder="logistics@company.com" value="" onChange={()=>{}} />
          <FormInput label="Phone" placeholder="+91-..." value="" onChange={()=>{}} />
          <FormInput label="City" placeholder="e.g. Mumbai" value="" onChange={()=>{}} />
          <FormSelect label="Payment Terms (days)" options={['15','30','45','60','90']} value="30" onChange={()=>{}} />
          <SubmitBtn label="Register Vendor" color="#00d4ff" onClick={()=>{}} />
        </ActionModal>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {VENDORS.map(v => (
          <div key={v.name} style={{ padding:'16px', borderRadius:12, background:'rgba(12,18,32,0.8)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{
                width:38, height:38, borderRadius:10,
                background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, fontWeight:700, color:'#00d4ff',
              }}>{v.name.charAt(0)}</div>
              <span style={{
                padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:600,
                background: v.status==='Active'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)',
                color: v.status==='Active'?'#10b981':'#f59e0b',
              }}>{v.status}</span>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{v.name}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:12 }}>{v.gstin}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['City',v.city,'var(--text-secondary)'],['Terms',`${v.terms}d`,'#00d4ff'],['Spend',v.spend,'#10b981']].map(([l,val,c])=>(
                <div key={String(l)}>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:String(c) }}>{String(val)}</div>
                </div>
              ))}
            </div>
            {/* Rating stars */}
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:4 }}>
              {[1,2,3,4,5].map(s => (
                <div key={s} style={{ width:10, height:10, borderRadius:2, background: s<=Math.floor(v.rating) ? '#f59e0b' : 'rgba(255,255,255,0.1)' }} />
              ))}
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:4 }}>{v.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon, color='#7c3aed' }: { title:string; icon:string; color?:string }) {
  return (
    <div style={{ padding:'40px 20px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>{icon}</div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{title}</h2>
      <p style={{ color:'var(--text-muted)', fontSize:13 }}>This module is under development — coming soon.</p>
    </div>
  );
}

export default function ERPModule() {
  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="erp"
        icon="📦"
        title="Core ERP — S/4HANA"
        subtitle="ENTERPRISE RESOURCE PLANNING"
        color="#7c3aed"
        description="Manage your entire supply chain from a single pane. Control inventory levels, vendor relationships, warehouse utilisation, and procurement workflows with real-time visibility."
        features={['Inventory CRUD + stock adjustments','Vendor onboarding & management','Warehouse utilisation tracking','Purchase order lifecycle','Goods Receipt Note (GRN)','Cycle count scheduling','Bulk price updates','Document management']}
      />

      {/* Header */}
      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Core ERP <span style={{ color:'#7c3aed' }}>S/4HANA</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Enterprise Resource Planning — Inventory · Vendors · Warehouses · Finance
        </p>
        <SubNav />
      </div>

      <Routes>
        <Route index              element={<ERPOverview />} />
        <Route path="inventory"  element={<InventoryPage />} />
        <Route path="vendors"    element={<VendorsPage />} />
        <Route path="warehouses" element={<PlaceholderPage title="Warehouse Management" icon="🏭" color="#f97316" />} />
        <Route path="documents"  element={<PlaceholderPage title="Document Management"  icon="📄" color="#00d4ff" />} />
        <Route path="config"     element={<PlaceholderPage title="ERP Configuration"    icon="⚙️" color="#f59e0b" />} />
      </Routes>
    </div>
  );
}
