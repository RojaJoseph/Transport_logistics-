import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Truck, Package, DollarSign, AlertTriangle, Clock, Globe } from 'lucide-react';
import api from '@/lib/api';

const ACCENT   = '#00e5ff';
const SUCCESS  = '#00e676';
const WARNING  = '#ffab00';
const DANGER   = '#ff1744';
const PURPLE   = '#7c3aed';
const ORANGE   = '#ff6b2b';

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend }: any) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 animate-slide-up"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <div className="p-2 rounded-lg" style={{ background: `rgba(${hexToRgb(color)}, 0.12)` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend >= 0
            ? <TrendingUp size={11} style={{ color: SUCCESS }} />
            : <TrendingDown size={11} style={{ color: DANGER }} />}
          <span className="text-xs" style={{ color: trend >= 0 ? SUCCESS : DANGER }}>
            {Math.abs(trend)}% vs last month
          </span>
        </div>
      </div>
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded" style={{ background: ACCENT }} />
        <h2 className="text-sm font-bold tracking-widest" style={{ color: 'var(--color-text)' }}>{title}</h2>
      </div>
      {sub && <p className="text-xs mt-1 ml-3" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Chart Card ───────────────────────────────────────────────────
function ChartCard({ title, children, className = '' }: any) {
  return (
    <div className={`rounded-xl p-5 ${className}`}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
      {children}
    </div>
  );
}

// ── Mock data ────────────────────────────────────────────────────
const shipmentTrend = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  delivered: Math.floor(800 + Math.random() * 400),
  inTransit: Math.floor(200 + Math.random() * 200),
  delayed: Math.floor(20 + Math.random() * 80),
}));

const revenueTrend = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  revenue: Math.floor(400_000 + Math.random() * 200_000),
  cost: Math.floor(250_000 + Math.random() * 100_000),
}));

const modeSplit = [
  { name: 'Road', value: 48, color: ACCENT },
  { name: 'Rail', value: 22, color: PURPLE },
  { name: 'Air',  value: 18, color: ORANGE },
  { name: 'Sea',  value: 12, color: SUCCESS },
];

const topRoutes = [
  { route: 'Mumbai → Delhi',    count: 3420, pct: 100 },
  { route: 'Chennai → Kolkata', count: 2810, pct: 82 },
  { route: 'Bangalore → Pune',  count: 2200, pct: 64 },
  { route: 'Hyderabad → Surat', count: 1950, pct: 57 },
  { route: 'Ahmedabad → Jaipur',count: 1450, pct: 42 },
];

const alerts = [
  { id: 1, type: 'danger',  msg: 'SHP-2847 — Customs hold at Chennai port', time: '3m ago' },
  { id: 2, type: 'warning', msg: 'Vehicle TN-09-AB-3421 — Temperature deviation detected', time: '11m ago' },
  { id: 3, type: 'warning', msg: 'Order ORD-19283 — Delivery SLA at risk (2h left)', time: '28m ago' },
  { id: 4, type: 'info',    msg: 'AI route optimisation saved ₹84,200 this week', time: '1h ago' },
];

const alertColor: Record<string, string> = {
  danger: DANGER, warning: WARNING, info: ACCENT,
};

// ── Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            LIVE · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)' }}>
          <div className="w-2 h-2 rounded-full live-dot" style={{ background: SUCCESS }} />
          <span style={{ color: SUCCESS }}>ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="ACTIVE SHIPMENTS"  value="4,821"    sub="Across 12 transport modes"   icon={Truck}         color={ACCENT}   trend={8.2} />
        <StatCard label="ORDERS TODAY"      value="1,247"    sub="342 pending, 905 confirmed"  icon={Package}       color={PURPLE}   trend={12.5} />
        <StatCard label="REVENUE (MTD)"     value="₹4.2Cr"   sub="Target: ₹5.0Cr"             icon={DollarSign}    color={SUCCESS}  trend={-3.1} />
        <StatCard label="ON-TIME DELIVERY"  value="94.3%"    sub="Industry avg: 87%"           icon={Clock}         color={WARNING}  trend={2.8} />
        <StatCard label="DELAYED SHIPMENTS" value="218"      sub="SLA breach risk: 48"         icon={AlertTriangle} color={DANGER}   trend={-5.4} />
        <StatCard label="ACTIVE CARRIERS"   value="87"       sub="Fleet utilisation: 78%"      icon={Truck}         color={ORANGE}   trend={1.2} />
        <StatCard label="COUNTRIES SERVED"  value="34"       sub="6 new markets this quarter"  icon={Globe}         color={ACCENT}   trend={20.0} />
        <StatCard label="AI SAVINGS (MTD)"  value="₹12.8L"  sub="Route + load optimisation"   icon={TrendingUp}    color={SUCCESS}  trend={34.7} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="SHIPMENT VOLUME — 12 MONTHS" className="col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={shipmentTrend}>
              <defs>
                <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ACCENT}  stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ACCENT}  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDelayed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={DANGER}  stopOpacity={0.3} />
                  <stop offset="95%" stopColor={DANGER}  stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7899', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6b7899', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#181c24', border: '1px solid #1e2330', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="delivered" stroke={ACCENT}  fill="url(#gDelivered)" strokeWidth={2} name="Delivered" />
              <Area type="monotone" dataKey="delayed"   stroke={DANGER}  fill="url(#gDelayed)"   strokeWidth={2} name="Delayed" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="TRANSPORT MODE SPLIT">
          <div className="flex flex-col gap-4 h-[220px] justify-center">
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={modeSplit} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {modeSplit.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2">
              {modeSplit.map((m) => (
                <div key={m.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>{m.name}</span>
                  <span className="ml-auto font-mono font-bold" style={{ color: 'var(--color-text)' }}>{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="REVENUE vs COST — 12 MONTHS" className="col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueTrend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7899', fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fill: '#6b7899', fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `₹${(v/100000).toFixed(1)}L`} contentStyle={{ background: '#181c24', border: '1px solid #1e2330', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" fill={SUCCESS}  radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="cost"    fill={ORANGE}   radius={[4,4,0,0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Routes */}
        <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>TOP ROUTES</div>
          <div className="space-y-3">
            {topRoutes.map((r) => (
              <div key={r.route}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--color-text)' }}>{r.route}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${r.pct}%`, background: `linear-gradient(90deg, ${ACCENT}, ${PURPLE})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Alerts */}
      <div>
        <SectionHeader title="LIVE ALERTS" sub="Real-time operational issues" />
        <div className="grid grid-cols-2 gap-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(alertColor[a.type])}, 0.25)` }}>
              <div className="w-2 h-2 rounded-full mt-1.5 live-dot" style={{ background: alertColor[a.type] }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{a.msg}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}`;
}
