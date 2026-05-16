import { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Package2, Users, Warehouse, FileText,
  Plus, Search, TrendingUp, TrendingDown,
  CheckCircle2, ArrowRight, ShoppingCart,
  BarChart3, RefreshCw, Tag,
} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────
interface InvItem {
  sku: string; name: string; qty: number; unit: string;
  warehouse: string; status: string; value: string; pct: number;
}
interface Vendor {
  name: string; gstin: string; city: string;
  terms: number; rating: number; status: string; spend: string;
}

// ── Seed data ─────────────────────────────────────────────────────
const SEED_INV: InvItem[] = [
  { sku:'SKU-00123', name:'Palletized Cargo A',  qty:4200, unit:'Units',  warehouse:'Chennai Hub',  status:'In Stock',     value:'₹8,40,000',  pct:100 },
  { sku:'SKU-00124', name:'Cold Chain Pack B',   qty:850,  unit:'Cases',  warehouse:'Delhi Cold',   status:'Low Stock',    value:'₹2,12,500',  pct:62  },
  { sku:'SKU-00125', name:'Hazmat Drums C',      qty:0,    unit:'Drums',  warehouse:'Mumbai Port',  status:'Out of Stock', value:'₹0',          pct:0   },
  { sku:'SKU-00126', name:'Electronics Batch D', qty:1100, unit:'Boxes',  warehouse:'Bangalore DC', status:'In Stock',     value:'₹44,00,000', pct:88  },
  { sku:'SKU-00127', name:'Textile Roll E',      qty:320,  unit:'Rolls',  warehouse:'Surat Depot',  status:'In Stock',     value:'₹6,40,000',  pct:75  },
  { sku:'SKU-00128', name:'Auto Parts Kit F',    qty:60,   unit:'Sets',   warehouse:'Pune Plant',   status:'Low Stock',    value:'₹3,00,000',  pct:18  },
];

const SEED_VENDORS: Vendor[] = [
  { name:'Tata Motors Ltd',     gstin:'27AABCT1234F1ZV', city:'Mumbai',    terms:30, rating:4.5, status:'Active', spend:'₹84L'  },
  { name:'Reliance Industries', gstin:'27AAACR1234G1ZX', city:'Mumbai',    terms:45, rating:4.2, status:'Active', spend:'₹1.2Cr'},
  { name:'Infosys Logistics',   gstin:'29AABCI1234H1ZY', city:'Bangalore', terms:30, rating:4.7, status:'Active', spend:'₹32L'  },
  { name:'Mahindra & Mahindra', gstin:'27AABCM1234I1ZW', city:'Pune',      terms:60, rating:4.3, status:'Active', spend:'₹56L'  },
  { name:'Asian Paints Ltd',    gstin:'27AABCA1234J1ZV', city:'Mumbai',    terms:30, rating:3.9, status:'Review', spend:'₹18L'  },
  { name:'HCL Technologies',    gstin:'29AABCH1234K1ZU', city:'Noida',     terms:30, rating:4.1, status:'Active', spend:'₹44L'  },
];

// ── Shared status config ──────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'In Stock':     { bg:'rgba(16,185,129,0.1)',  color:'#10b981' },
  'Low Stock':    { bg:'rgba(245,158,11,0.1)',  color:'#f59e0b' },
  'Out of Stock': { bg:'rgba(239,68,68,0.1)',   color:'#ef4444' },
};

// ── Sub-nav ───────────────────────────────────────────────────────
const TABS = ['Overview','Inventory','Vendors','Warehouses','Documents'];

function SubNav() {
  const loc = useLocation();
  return (
    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
      {TABS.map(t => {
        const path   = `/erp${t === 'Overview' ? '' : '/' + t.toLowerCase()}`;
        const active = t === 'Overview'
          ? (loc.pathname === '/erp' || loc.pathname === '/erp/')
          : loc.pathname.startsWith(path);
        return (
          <NavLink key={t} to={path} end={t === 'Overview'} style={{
            padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:600,
            textDecoration:'none', transition:'all 0.15s',
            background: active ? '#7c3aed' : 'rgba(255,255,255,0.04)',
            color: active ? '#fff' : 'var(--text-muted)',
            border:`1px solid ${active ? '#7c3aed50' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: active ? '0 0 16px #7c3aed40' : 'none',
          }}>{t}</NavLink>
        );
      })}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, trend }: any) {
  return (
    <div style={{
      padding:'18px 20px',
      background:'linear-gradient(135deg,rgba(12,18,32,0.9),rgba(8,13,20,0.95))',
      border:`1px solid ${color}20`, borderRadius:14, position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:`linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ padding:'8px', borderRadius:10, background:`${color}15` }}>
          <Icon size={16} color={color} />
        </div>
        {trend != null && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:trend >= 0 ? '#10b981' : '#ef4444' }}>
            {trend >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
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

// ── Inventory page ────────────────────────────────────────────────
function InventoryPage({ items, onAdd }: { items: InvItem[]; onAdd: (item: InvItem) => void }) {
  const [search, setSearch] = useState('');
  const [form, setForm]     = useState({ sku:'', name:'', qty:'', unit:'Units', cost:'' });

  const WAREHOUSES = ['Chennai Hub','Delhi Cold','Mumbai Port','Bangalore DC','Surat Depot','Pune Plant'];

  const filtered = items.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.sku || !form.name || !form.qty) {
      toast.error('SKU, name and quantity are required');
      return;
    }
    const qty  = parseInt(form.qty) || 0;
    const cost = parseFloat(form.cost) || 0;
    const val  = qty * cost;
    onAdd({
      sku: form.sku, name: form.name, qty, unit: form.unit,
      warehouse: WAREHOUSES[0],
      status: qty === 0 ? 'Out of Stock' : qty < 100 ? 'Low Stock' : 'In Stock',
      value: val > 0 ? `₹${val.toLocaleString('en-IN')}` : '₹0',
      pct: Math.min(100, Math.round((qty / 5000) * 100)),
    });
    setForm({ sku:'', name:'', qty:'', unit:'Units', cost:'' });
    toast.success(`${form.name} added to inventory`);
  };

  return (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
        <div style={{ position:'relative', flex:1, maxWidth:320 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU / product…"
            style={{ width:'100%', paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:8, color:'var(--text-primary)', fontSize:12, outline:'none', boxSizing:'border-box' }} />
        </div>
        <ActionModal title="Add Inventory Item" color="#7c3aed" trigger={
          <button className="btn btn-primary btn-sm" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', gap:6 }}>
            <Plus size={13}/> Add Item
          </button>
        }>
          <FormInput label="SKU"          placeholder="e.g. SKU-00130"         value={form.sku}  onChange={v => setForm(p => ({ ...p, sku:v }))}  />
          <FormInput label="Product Name" placeholder="e.g. Electronics Batch G" value={form.name} onChange={v => setForm(p => ({ ...p, name:v }))} />
          <FormInput label="Quantity"     type="number"                         value={form.qty}  onChange={v => setForm(p => ({ ...p, qty:v }))}  />
          <FormSelect label="Unit" options={['Units','Boxes','Cases','Drums','Rolls','Sets','Cartons']} value={form.unit} onChange={v => setForm(p => ({ ...p, unit:v }))} />
          <FormInput label="Unit Cost (₹)" type="number" placeholder="e.g. 4000" value={form.cost} onChange={v => setForm(p => ({ ...p, cost:v }))} />
          <SubmitBtn label="Add to Inventory" color="#7c3aed" onClick={handleAdd} />
        </ActionModal>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:13 }}>
          No items found. Add one above ↑
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
        {filtered.map(row => {
          const { bg, color } = STATUS_STYLE[row.status] ?? { bg:'rgba(255,255,255,0.05)', color:'var(--text-muted)' };
          return (
            <div key={row.sku} style={{
              padding:'16px', borderRadius:12,
              background:'rgba(12,18,32,0.8)',
              border:'1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, color:'#7c3aed', fontFamily:'var(--font-mono)', fontWeight:700 }}>{row.sku}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginTop:2 }}>{row.name}</div>
                </div>
                <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:bg, color }}>{row.status}</span>
              </div>
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

// ── Vendors page ──────────────────────────────────────────────────
function VendorsPage({ vendors, onAdd }: { vendors: Vendor[]; onAdd: (v: Vendor) => void }) {
  const [form, setForm] = useState({ name:'', gstin:'', email:'', phone:'', city:'', terms:'30' });

  const handleAdd = () => {
    if (!form.name) { toast.error('Company name is required'); return; }
    onAdd({
      name: form.name, gstin: form.gstin || 'N/A',
      city: form.city || 'N/A', terms: parseInt(form.terms) || 30,
      rating: 3.5, status: 'Active', spend: '₹0',
    });
    setForm({ name:'', gstin:'', email:'', phone:'', city:'', terms:'30' });
    toast.success(`${form.name} registered`);
  };

  return (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {vendors.length} VENDORS
        </div>
        <ActionModal title="Add New Vendor" color="#00d4ff" trigger={
          <button className="btn btn-primary btn-sm" style={{ gap:6 }}><Plus size={13}/>Add Vendor</button>
        }>
          <FormInput label="Company Name"   placeholder="e.g. HDFC Logistics"    value={form.name}  onChange={v => setForm(p => ({ ...p, name:v }))}  />
          <FormInput label="GSTIN"          placeholder="27AABCX1234Y1Z5"         value={form.gstin} onChange={v => setForm(p => ({ ...p, gstin:v }))} />
          <FormInput label="Contact Email"  placeholder="logistics@company.com"   value={form.email} onChange={v => setForm(p => ({ ...p, email:v }))} />
          <FormInput label="Phone"          placeholder="+91-..."                  value={form.phone} onChange={v => setForm(p => ({ ...p, phone:v }))} />
          <FormInput label="City"           placeholder="e.g. Mumbai"             value={form.city}  onChange={v => setForm(p => ({ ...p, city:v }))}  />
          <FormSelect label="Payment Terms (days)" options={['15','30','45','60','90']} value={form.terms} onChange={v => setForm(p => ({ ...p, terms:v }))} />
          <SubmitBtn label="Register Vendor" color="#00d4ff" onClick={handleAdd} />
        </ActionModal>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {vendors.map(v => (
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
                background: v.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                color:      v.status === 'Active' ? '#10b981' : '#f59e0b',
              }}>{v.status}</span>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{v.name}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:12 }}>{v.gstin}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {([['City', v.city, 'var(--text-secondary)'], ['Terms', `${v.terms}d`, '#00d4ff'], ['Spend', v.spend, '#10b981']] as [string,string,string][]).map(([l, val, c]) => (
                <div key={l}>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:c }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:4 }}>
              {[1,2,3,4,5].map(s => (
                <div key={s} style={{ width:10, height:10, borderRadius:2, background: s <= Math.floor(v.rating) ? '#f59e0b' : 'rgba(255,255,255,0.1)' }} />
              ))}
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:4 }}>{v.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ERP Overview (quick actions now show toasts) ───────────────────
function ERPOverview({ invCount, vendorCount }: { invCount: number; vendorCount: number }) {
  return (
    <div style={{ padding:'0 20px 20px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        <KpiCard label="TOTAL SKUs"     value={invCount.toLocaleString()}    sub="Across 5 warehouses" color="#7c3aed" icon={Package2}  trend={3.2}  />
        <KpiCard label="ACTIVE VENDORS" value={vendorCount.toLocaleString()} sub="18 pending approval"  color="#00d4ff" icon={Users}     trend={1.8}  />
        <KpiCard label="WAREHOUSES"     value="18"                           sub="78% capacity used"    color="#f97316" icon={Warehouse} trend={null} />
        <KpiCard label="OPEN POs"       value="437"                          sub="₹2.4Cr pending"       color="#10b981" icon={FileText}  trend={-2.1} />
      </div>

      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
          QUICK ACTIONS — Click any card to open form
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { icon:<ShoppingCart size={16} color="#7c3aed"/>, label:'Create Purchase Order', color:'#7c3aed', desc:'Raise a new PO to any vendor' },
            { icon:<RefreshCw    size={16} color="#00d4ff"/>, label:'Stock Adjustment',       color:'#00d4ff', desc:'Add or remove stock manually' },
            { icon:<Users        size={16} color="#f97316"/>, label:'Vendor Onboarding',      color:'#f97316', desc:'Register a new vendor partner' },
            { icon:<CheckCircle2 size={16} color="#10b981"/>, label:'Generate GRN',           color:'#10b981', desc:'Goods Receipt Note for inbound' },
            { icon:<BarChart3    size={16} color="#f59e0b"/>, label:'Cycle Count',             color:'#f59e0b', desc:'Schedule inventory cycle count' },
            { icon:<Tag          size={16} color="#8b5cf6"/>, label:'Price Update',            color:'#8b5cf6', desc:'Bulk update product pricing' },
          ].map(a => (
            <ActionModal key={a.label} title={a.label} color={a.color} trigger={
              <div style={{
                padding:'16px', borderRadius:12, cursor:'pointer',
                background:'rgba(255,255,255,0.02)',
                border:'1px solid rgba(255,255,255,0.06)',
                transition:'all 0.18s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}0a`; (e.currentTarget as HTMLElement).style.borderColor = `${a.color}30`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ padding:'8px', borderRadius:10, background:`${a.color}15` }}>{a.icon}</div>
                  <ArrowRight size={14} color={a.color} />
                </div>
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>{a.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{a.desc}</div>
                </div>
              </div>
            }>
              {/* Generic quick-action form */}
              <FormInput label="Reference / ID" placeholder="e.g. Auto-generated" value="" onChange={() => {}} />
              <FormInput label="Notes"          placeholder="Optional notes"       value="" onChange={() => {}} />
              <SubmitBtn label={`Submit — ${a.label}`} color={a.color} onClick={() => toast.success(`${a.label} submitted!`)} />
            </ActionModal>
          ))}
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
            <div style={{ textAlign:'center' }}>
              <svg width={70} height={70} viewBox="0 0 70 70" style={{ display:'block', margin:'0 auto' }}>
                <circle cx={35} cy={35} r={28} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <circle cx={35} cy={35} r={28} fill="none" stroke={w.color} strokeWidth={6}
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - w.used / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 35 35)"
                  style={{ filter:`drop-shadow(0 0 4px ${w.color})` }} />
                <text x={35} y={39} textAnchor="middle" fill={w.color} fontSize={13} fontWeight={700} fontFamily="monospace">{w.used}%</text>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ padding:'40px 20px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>{icon}</div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{title}</h2>
      <p style={{ color:'var(--text-muted)', fontSize:13 }}>This module is under development — coming soon.</p>
    </div>
  );
}

// ── Root module — holds all shared state ──────────────────────────
export default function ERPModule() {
  const [inventory, setInventory] = useState<InvItem[]>(SEED_INV);
  const [vendors,   setVendors]   = useState<Vendor[]>(SEED_VENDORS);

  const addInvItem = (item: InvItem) =>
    setInventory(prev => [item, ...prev]);

  const addVendor = (v: Vendor) =>
    setVendors(prev => [v, ...prev]);

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
        <Route index             element={<ERPOverview invCount={inventory.length} vendorCount={vendors.length} />} />
        <Route path="inventory"  element={<InventoryPage items={inventory} onAdd={addInvItem} />} />
        <Route path="vendors"    element={<VendorsPage vendors={vendors} onAdd={addVendor} />} />
        <Route path="warehouses" element={<PlaceholderPage title="Warehouse Management" icon="🏭" />} />
        <Route path="documents"  element={<PlaceholderPage title="Document Management"  icon="📄" />} />
      </Routes>
    </div>
  );
}
