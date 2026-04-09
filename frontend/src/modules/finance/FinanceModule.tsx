import { useState } from 'react';
import { DollarSign, FileText, CreditCard, TrendingUp, Download, Filter } from 'lucide-react';

const INVOICES = [
  { id: 'INV-2025-0481', customer: 'Tata Motors Ltd',       amount: '₹4,82,500', due: '2025-05-15', status: 'Paid',     date: '2025-04-01' },
  { id: 'INV-2025-0480', customer: 'Reliance Industries',   amount: '₹12,40,000',due: '2025-05-10', status: 'Pending',  date: '2025-03-28' },
  { id: 'INV-2025-0479', customer: 'Infosys Logistics',     amount: '₹2,18,750', due: '2025-04-30', status: 'Overdue',  date: '2025-03-20' },
  { id: 'INV-2025-0478', customer: 'Mahindra & Mahindra',   amount: '₹8,95,000', due: '2025-05-20', status: 'Pending',  date: '2025-04-02' },
  { id: 'INV-2025-0477', customer: 'Asian Paints Ltd',      amount: '₹1,62,300', due: '2025-04-25', status: 'Paid',     date: '2025-03-25' },
  { id: 'INV-2025-0476', customer: 'HDFC Logistics',        amount: '₹3,44,800', due: '2025-04-28', status: 'Overdue',  date: '2025-03-18' },
];

const invStatus: Record<string, { bg: string; color: string }> = {
  Paid:    { bg: 'rgba(0,230,118,0.1)',  color: '#00e676' },
  Pending: { bg: 'rgba(255,171,0,0.1)',  color: '#ffab00' },
  Overdue: { bg: 'rgba(255,23,68,0.1)',  color: '#ff1744' },
};

export default function FinanceModule() {
  const [tab, setTab] = useState<'invoices'|'billing'|'reports'>('invoices');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Finance & Billing <span style={{ color: '#ca8a04' }}>Revenue Intelligence</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Invoicing · Payments · Cost accounting · P&L · Stripe</p>
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Revenue (MTD)',   value: '₹4.2Cr',  color: '#00e676', sub: 'Target: ₹5.0Cr' },
          { label: 'Outstanding',    value: '₹1.8Cr',  color: '#ffab00', sub: '12 invoices' },
          { label: 'Overdue',        value: '₹48.4L',  color: '#ff1744', sub: '3 invoices >30d' },
          { label: 'Gross Margin',   value: '34.2%',   color: '#00e5ff', sub: '+2.1% vs last mo' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(color)},0.2)` }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{label.toUpperCase()}</div>
            <div className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {(['invoices','billing','reports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide capitalize transition-all"
            style={{ background: tab === t ? '#ca8a04' : 'transparent', color: tab === t ? '#000' : 'var(--color-text-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>INVOICE LIST</span>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <Filter size={12} /> Filter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#ca8a04', color: '#000' }}>
                <FileText size={12} /> New Invoice
              </button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  {['Invoice ID','Customer','Amount','Issue Date','Due Date','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv, i) => (
                  <tr key={inv.id} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: '#ca8a04' }}>{inv.id}</td>
                    <td className="px-4 py-3 font-medium">{inv.customer}</td>
                    <td className="px-4 py-3 font-mono font-bold">{inv.amount}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{inv.date}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{inv.due}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full font-semibold" style={invStatus[inv.status]}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button><Download size={13} style={{ color: 'var(--color-text-muted)' }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <CreditCard size={36} className="mx-auto mb-3" style={{ color: '#ca8a04' }} />
          <h2 className="font-bold text-lg mb-2">Billing Configuration</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Stripe integration · Payment gateway · Recurring billing</p>
        </div>
      )}

      {tab === 'reports' && (
        <div className="grid grid-cols-2 gap-4">
          {['P&L Statement','Balance Sheet','Cash Flow','Cost by Lane','Carrier Spend','Revenue Forecast'].map((r) => (
            <button key={r} className="flex items-center justify-between p-4 rounded-xl text-sm font-medium text-left hover:opacity-80 transition-all"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span>{r}</span>
              <Download size={14} style={{ color: '#ca8a04' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}`;
}
