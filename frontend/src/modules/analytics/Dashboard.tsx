import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Truck, Package, DollarSign,
         AlertTriangle, Clock, Globe, Activity } from 'lucide-react';

const A = '#00d4ff', S = '#10b981', W = '#f59e0b', D = '#ef4444', P = '#7c3aed', O = '#f97316';

function rgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '255,255,255';
}

const KPI = [
  { label:'ACTIVE SHIPMENTS', value:'4,821',  sub:'Across 12 transport modes',  icon:Truck,         color:A, trend:8.2  },
  { label:'ORDERS TODAY',     value:'1,247',  sub:'342 pending · 905 confirmed', icon:Package,       color:P, trend:12.5 },
  { label:'REVENUE (MTD)',    value:'₹4.2Cr', sub:'Target: ₹5.0Cr',             icon:DollarSign,    color:S, trend:-3.1 },
  { label:'ON-TIME DELIVERY', value:'94.3%',  sub:'Industry avg: 87%',           icon:Clock,         color:W, trend:2.8  },
  { label:'DELAYED',          value:'218',    sub:'SLA breach risk: 48',         icon:AlertTriangle, color:D, trend:-5.4 },
  { label:'ACTIVE CARRIERS',  value:'87',     sub:'Fleet utilisation: 78%',      icon:Truck,         color:O, trend:1.2  },
  { label:'COUNTRIES SERVED', value:'34',     sub:'6 new markets this quarter',  icon:Globe,         color:A, trend:20.0 },
  { label:'AI SAVINGS (MTD)', value:'₹12.8L', sub:'Route + load optimisation',  icon:TrendingUp,    color:S, trend:34.7 },
];

const shipTrend = Array.from({length:12},(_,i)=>({
  month:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  delivered: Math.floor(800+Math.random()*400),
  delayed:   Math.floor(20+Math.random()*80),
}));

const revTrend = Array.from({length:12},(_,i)=>({
  month:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  revenue: Math.floor(400000+Math.random()*200000),
  cost:    Math.floor(250000+Math.random()*100000),
}));

const modes = [
  { name:'Road', value:48, color:A },
  { name:'Rail', value:22, color:P },
  { name:'Air',  value:18, color:O },
  { name:'Sea',  value:12, color:S },
];

const routes = [
  { route:'Mumbai → Delhi',     count:3420, pct:100 },
  { route:'Chennai → Kolkata',  count:2810, pct:82  },
  { route:'Bangalore → Pune',   count:2200, pct:64  },
  { route:'Hyderabad → Surat',  count:1950, pct:57  },
  { route:'Ahmedabad → Jaipur', count:1450, pct:42  },
];

const alerts = [
  { type:'danger',  msg:'SHP-2847 — Customs hold at Chennai port',             time:'3m ago'  },
  { type:'warning', msg:'Vehicle TN-09-AB-3421 — Temperature deviation',        time:'11m ago' },
  { type:'warning', msg:'Order ORD-19283 — Delivery SLA at risk (2h left)',     time:'28m ago' },
  { type:'info',    msg:'AI route optimisation saved ₹84,200 this week',        time:'1h ago'  },
];
const alertColor: Record<string,string> = { danger:D, warning:W, info:A };

const TT = { contentStyle:{ background:'rgba(8,13,20,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:11 } };

export default function Dashboard() {
  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:0 }}>
            Operations Dashboard
          </h1>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--font-mono)' }}>
            LIVE · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'8px 16px', borderRadius:10,
          background:'rgba(16,185,129,0.06)',
          border:'1px solid rgba(16,185,129,0.2)',
        }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:S, boxShadow:`0 0 8px ${S}`, animation:'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize:11, fontWeight:700, color:S, fontFamily:'var(--font-mono)', letterSpacing:'0.06em' }}>
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {KPI.map(({ label, value, sub, icon:Icon, color, trend }) => (
          <div key={label} className="stat-card animate-fade-up"
            style={{ '--card-accent': color } as any}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                {label}
              </span>
              <div style={{ padding:'6px', borderRadius:8, background:`rgba(${rgb(color)},0.1)` }}>
                <Icon size={13} color={color} />
              </div>
            </div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.02em', fontFamily:'var(--font-display)', color:'var(--text-primary)', marginBottom:6 }}>
              {value}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              {trend >= 0
                ? <TrendingUp size={11} color={S} />
                : <TrendingDown size={11} color={D} />}
              <span style={{ fontSize:10, color: trend>=0?S:D, fontWeight:600 }}>
                {Math.abs(trend)}% vs last month
              </span>
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:12 }}>

        {/* Shipment Volume */}
        <div style={{ padding:18, borderRadius:12, background:'rgba(12,18,32,0.8)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
            SHIPMENT VOLUME — 12 MONTHS
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={shipTrend}>
              <defs>
                <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={A} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={A} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={D} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={D} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill:'#4a5568', fontSize:10 }} />
              <YAxis tick={{ fill:'#4a5568', fontSize:10 }} />
              <Tooltip {...TT} />
              <Area type="monotone" dataKey="delivered" stroke={A} fill="url(#gD)" strokeWidth={2} name="Delivered" />
              <Area type="monotone" dataKey="delayed"   stroke={D} fill="url(#gR)" strokeWidth={2} name="Delayed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mode split */}
        <div style={{ padding:18, borderRadius:12, background:'rgba(12,18,32,0.8)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
            TRANSPORT MODE SPLIT
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={modes} cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={3} dataKey="value">
                {modes.map((m,i) => <Cell key={i} fill={m.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
            {modes.map(m => (
              <div key={m.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:m.color, flexShrink:0 }} />
                <span style={{ fontSize:11, color:'var(--text-muted)', flex:1 }}>{m.name}</span>
                <span style={{ fontSize:11, fontWeight:700, color:m.color, fontFamily:'var(--font-mono)' }}>{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:20 }}>

        {/* Revenue vs Cost */}
        <div style={{ padding:18, borderRadius:12, background:'rgba(12,18,32,0.8)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
            REVENUE vs COST — 12 MONTHS
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revTrend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill:'#4a5568', fontSize:10 }} />
              <YAxis tickFormatter={v=>`₹${(v/100000).toFixed(0)}L`} tick={{ fill:'#4a5568', fontSize:10 }} />
              <Tooltip formatter={(v:number)=>`₹${(v/100000).toFixed(1)}L`} {...TT} />
              <Bar dataKey="revenue" fill={S}  radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="cost"    fill={O}  radius={[4,4,0,0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top routes */}
        <div style={{ padding:18, borderRadius:12, background:'rgba(12,18,32,0.8)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
            TOP ROUTES
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {routes.map(r => (
              <div key={r.route}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{r.route}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{r.count.toLocaleString()}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width:`${r.pct}%`, background:`linear-gradient(90deg,${A},${P})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Alerts */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:12 }}>
          LIVE ALERTS
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {alerts.map((al, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'flex-start', gap:12,
              padding:'12px 14px', borderRadius:10,
              background:'rgba(12,18,32,0.7)',
              border:`1px solid rgba(${rgb(alertColor[al.type])},0.2)`,
            }}>
              <div style={{ width:7, height:7, borderRadius:'50%', marginTop:4, flexShrink:0, background:alertColor[al.type], boxShadow:`0 0 6px ${alertColor[al.type]}` }} />
              <div style={{ flex:1 }}>
                <p style={{ fontSize:12, margin:0, lineHeight:1.5 }}>{al.msg}</p>
                <p style={{ fontSize:10, margin:'4px 0 0', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{al.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
