import { useState } from 'react';
import { ShoppingCart, Clock, CheckCircle2, XCircle, Truck, Search, Plus, ChevronRight } from 'lucide-react';

const ORDERS = [
  { id: 'ORD-19283', customer: 'Tata Motors',     origin: 'Mumbai',    dest: 'Delhi',      items: 42, value: '₹8,24,000', status: 'Confirmed',   created: '2025-04-06 09:12', sla: '2025-04-09' },
  { id: 'ORD-19284', customer: 'Reliance Retail',  origin: 'Bangalore', dest: 'Chennai',    items: 8,  value: '₹1,44,500', status: 'In Transit',  created: '2025-04-06 08:45', sla: '2025-04-08' },
  { id: 'ORD-19285', customer: 'Infosys',          origin: 'Pune',      dest: 'Hyderabad',  items: 15, value: '₹3,20,000', status: 'Pending',     created: '2025-04-06 10:00', sla: '2025-04-10' },
  { id: 'ORD-19286', customer: 'HCL Technologies', origin: 'Kolkata',   dest: 'Ahmedabad',  items: 200,value: '₹22,50,000',status: 'Delivered',   created: '2025-04-04 14:20', sla: '2025-04-06' },
  { id: 'ORD-19287', customer: 'Wipro Ltd',        origin: 'Chennai',   dest: 'Surat',      items: 5,  value: '₹68,500',   status: 'Cancelled',   created: '2025-04-05 11:30', sla: '2025-04-07' },
  { id: 'ORD-19288', customer: 'L&T Logistics',    origin: 'Delhi',     dest: 'Bangalore',  items: 88, value: '₹15,60,000',status: 'Confirmed',   created: '2025-04-06 07:00', sla: '2025-04-11' },
];

const orderStatus: Record<string, { bg: string; color: string; icon: any }> = {
  Confirmed:   { bg: 'rgba(0,229,255,0.1)',  color: '#00e5ff', icon: CheckCircle2 },
  'In Transit':{ bg: 'rgba(37,99,235,0.1)',  color: '#2563eb', icon: Truck },
  Pending:     { bg: 'rgba(255,171,0,0.1)',  color: '#ffab00', icon: Clock },
  Delivered:   { bg: 'rgba(0,230,118,0.1)',  color: '#00e676', icon: CheckCircle2 },
  Cancelled:   { bg: 'rgba(255,23,68,0.1)',  color: '#ff1744', icon: XCircle },
};

const ORDER_PIPELINE = [
  { stage: 'New',        count: 24 },
  { stage: 'Confirmed',  count: 187 },
  { stage: 'In Transit', count: 312 },
  { stage: 'Delivered',  count: 724 },
];

export default function OrderModule() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof ORDERS[0] | null>(null);

  const filtered = ORDERS.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Order Management <span style={{ color: '#0891b2' }}>Lifecycle Engine</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Create · Confirm · Dispatch · Track · Deliver · Invoice</p>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {ORDER_PIPELINE.map(({ stage, count }, i) => (
          <div key={stage} className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{stage.toUpperCase()}</div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: '#0891b2' }}>{count}</div>
            {i < 3 && <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-border)' }} />}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order / customer..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold ml-auto"
          style={{ background: '#0891b2', color: '#fff' }}>
          <Plus size={13} /> New Order
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Orders list */}
        <div className="col-span-2 space-y-2">
          {filtered.map((o) => {
            const { bg, color, icon: Icon } = orderStatus[o.status];
            return (
              <div key={o.id} onClick={() => setSelected(o)}
                className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:opacity-90"
                style={{ background: selected?.id === o.id ? 'var(--color-surface-2)' : 'var(--color-surface)', border: `1px solid ${selected?.id === o.id ? '#0891b2' : 'var(--color-border)'}` }}>
                <div className="p-2 rounded-lg" style={{ background: bg }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="min-w-[90px]">
                  <div className="text-xs font-bold font-mono" style={{ color: '#0891b2' }}>{o.id}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{o.customer}</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold">{o.origin} → {o.dest}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{o.items} items · {o.value}</div>
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color }}>{o.status}</span>
                  <div className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>SLA {o.sla}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {selected ? (
            <>
              <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>ORDER DETAIL</div>
              <div className="space-y-3">
                {[
                  ['Order ID',  selected.id],
                  ['Customer',  selected.customer],
                  ['Route',     `${selected.origin} → ${selected.dest}`],
                  ['Items',     selected.items.toString()],
                  ['Value',     selected.value],
                  ['Created',   selected.created],
                  ['SLA',       selected.sla],
                  ['Status',    selected.status],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                    <span className="text-xs font-semibold text-right" style={{ fontFamily: k === 'Order ID' ? 'var(--font-mono)' : undefined, color: k === 'Status' ? orderStatus[selected.status].color : 'var(--color-text)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="py-2 rounded-lg text-xs font-bold" style={{ background: '#0891b2', color: '#fff' }}>Edit Order</button>
                <button className="py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <ShoppingCart size={28} style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>Select an order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
