import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Package2, Users, Warehouse, FileText, Settings2, ChevronRight, Search, Filter, Plus, MoreVertical, TrendingUp } from 'lucide-react';

// ── Shared sub-nav ───────────────────────────────────────────────
const ERP_TABS = [
  { label: 'Overview',      path: '' },
  { label: 'Inventory',     path: 'inventory' },
  { label: 'Vendors',       path: 'vendors' },
  { label: 'Warehouses',    path: 'warehouses' },
  { label: 'Documents',     path: 'documents' },
  { label: 'Configuration', path: 'config' },
];

function ERPNav() {
  const loc = useLocation();
  return (
    <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', width: 'fit-content' }}>
      {ERP_TABS.map((t) => {
        const full = `/erp${t.path ? '/' + t.path : ''}`;
        const active = t.path === '' ? loc.pathname === '/erp' || loc.pathname === '/erp/' : loc.pathname.startsWith(full);
        return (
          <NavLink key={t.path} to={full} end={t.path === ''}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
            style={{ background: active ? 'var(--color-accent)' : 'transparent', color: active ? '#000' : 'var(--color-text-muted)' }}>
            {t.label}
          </NavLink>
        );
      })}
    </div>
  );
}

// ── Inventory Table ──────────────────────────────────────────────
const INVENTORY = [
  { sku: 'SKU-00123', name: 'Palletized Cargo A',   qty: 4200, unit: 'Units', warehouse: 'Chennai Hub',   status: 'In Stock',     value: '₹8,40,000' },
  { sku: 'SKU-00124', name: 'Cold Chain Pack B',     qty: 850,  unit: 'Cases', warehouse: 'Delhi Cold',    status: 'Low Stock',    value: '₹2,12,500' },
  { sku: 'SKU-00125', name: 'Hazmat Drums C',        qty: 0,    unit: 'Drums', warehouse: 'Mumbai Port',   status: 'Out of Stock', value: '₹0' },
  { sku: 'SKU-00126', name: 'Electronics Batch D',   qty: 1100, unit: 'Boxes', warehouse: 'Bangalore DC',  status: 'In Stock',     value: '₹44,00,000' },
  { sku: 'SKU-00127', name: 'Textile Roll E',        qty: 320,  unit: 'Rolls', warehouse: 'Surat Depot',   status: 'In Stock',     value: '₹6,40,000' },
  { sku: 'SKU-00128', name: 'Auto Parts Kit F',      qty: 60,   unit: 'Sets',  warehouse: 'Pune Plant',    status: 'Low Stock',    value: '₹3,00,000' },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  'In Stock':     { bg: 'rgba(0,230,118,0.1)',  color: '#00e676' },
  'Low Stock':    { bg: 'rgba(255,171,0,0.1)',  color: '#ffab00' },
  'Out of Stock': { bg: 'rgba(255,23,68,0.1)',  color: '#ff1744' },
};

function InventoryPage() {
  const [search, setSearch] = useState('');
  const filtered = INVENTORY.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>INVENTORY MANAGEMENT</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU / Product..."
              className="pl-9 pr-4 py-1.5 text-xs rounded-lg outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', width: 220 }} />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--color-accent)', color: '#000' }}>
            <Plus size={13} /> Add Item
          </button>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-surface-2)' }}>
              {['SKU','Product Name','Qty','Unit','Warehouse','Status','Value',''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row.sku} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-accent)' }}>{row.sku}</td>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 font-mono font-bold">{row.qty.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{row.unit}</td>
                <td className="px-4 py-3">{row.warehouse}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={statusStyle[row.status]}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{row.value}</td>
                <td className="px-4 py-3"><button><MoreVertical size={14} style={{ color: 'var(--color-text-muted)' }} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ERP Overview ─────────────────────────────────────────────────
const ERP_STATS = [
  { label: 'Total SKUs',       value: '12,480', icon: Package2,  color: '#00e5ff' },
  { label: 'Active Vendors',   value: '284',    icon: Users,     color: '#7c3aed' },
  { label: 'Warehouses',       value: '18',     icon: Warehouse, color: '#ff6b2b' },
  { label: 'Open POs',         value: '437',    icon: FileText,  color: '#00e676' },
];

function ERPOverview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {ERP_STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="p-3 rounded-xl" style={{ background: `rgba(${hexToRgb(color)},0.12)` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>QUICK ACTIONS</div>
        <div className="grid grid-cols-3 gap-3">
          {['Create Purchase Order','Stock Adjustment','Vendor Onboarding','Generate GRN','Cycle Count','Price Update'].map((a) => (
            <button key={a} className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-left transition-all hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              {a} <ChevronRight size={14} style={{ color: 'var(--color-accent)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ERPModule() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Core ERP <span style={{ color: 'var(--color-accent)' }}>S/4HANA</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Enterprise Resource Planning — Inventory · Vendors · Warehouses · Finance</p>
      </div>
      <ERPNav />
      <Routes>
        <Route index       element={<ERPOverview />} />
        <Route path="inventory"  element={<InventoryPage />} />
        <Route path="vendors"    element={<PlaceholderPage title="Vendor Management" />} />
        <Route path="warehouses" element={<PlaceholderPage title="Warehouse Management" />} />
        <Route path="documents"  element={<PlaceholderPage title="Document Management" />} />
        <Route path="config"     element={<PlaceholderPage title="ERP Configuration" />} />
      </Routes>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <Settings2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
      <h2 className="font-bold text-lg">{title}</h2>
      <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Module in development — coming soon.</p>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}`;
}
