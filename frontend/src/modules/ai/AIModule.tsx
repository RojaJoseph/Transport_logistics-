import { useState, useRef, useEffect } from 'react';
import { Brain, Zap, Send, Bot, User, TrendingUp, BarChart3, AlertTriangle, Package, Leaf, Cpu } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const AI_CAPS = [
  { icon:TrendingUp,   title:'Route Optimisation',  desc:'ML-powered shortest path with cost & time balance',      status:'Active', metric:'₹12.8L/mo saved', color:'#00d4ff' },
  { icon:BarChart3,    title:'Demand Forecasting',   desc:'30-day shipment volume forecast per lane',               status:'Active', metric:'92.4% accuracy',   color:'#7c3aed' },
  { icon:AlertTriangle,title:'Delay Prediction',     desc:'Weather + traffic + port congestion risk model',         status:'Active', metric:'SLA breach ↓38%',  color:'#f97316' },
  { icon:Package,      title:'Load Optimisation',    desc:'Bin-packing AI maximises vehicle utilisation',           status:'Active', metric:'22% fuel saved',   color:'#10b981' },
  { icon:Cpu,          title:'Anomaly Detection',    desc:'Detects fraud, route deviation & sensor faults',         status:'Active', metric:'Risk score ↓',     color:'#ef4444' },
  { icon:Leaf,         title:'Carbon Optimiser',     desc:'Selects lowest-emission transport mix',                  status:'Beta',   metric:'18% CO₂ ↓',       color:'#f59e0b' },
];

const INSIGHTS = [
  { type:'warning', msg:'Route MUM→DEL: 3h delay predicted (cyclone advisory). Alternate via Jaipur saves 1.2h.', time:'just now' },
  { type:'success', msg:'Load consolidation: SHP-2853 + SHP-2854 can share TN-09 vehicle → ₹18,400 saved.',        time:'2m ago'   },
  { type:'info',    msg:'Demand spike forecast: Bangalore corridor +34% next week (festive season). Pre-book capacity.', time:'5m ago' },
  { type:'warning', msg:'Carrier DTDC: on-time rate dropped to 81% this month. Consider reallocation.',            time:'12m ago'  },
];
const inC: Record<string,string> = { warning:'#f59e0b', success:'#10b981', info:'#00d4ff' };

interface Msg { role:'user'|'ai'; text:string; }

const DEMO_RESP = `I've analysed current data across your fleet and lanes:

**Route Mumbai → Delhi**
• Recommended: BlueDart Air (96.2% OTD)
• Cost: ₹24,500 | ETA: 2h 15m
• CO₂: 0.42 kg | Score: 0.94

**Alternative:** Road via NH-48 (₹8,200 | 14h | lower CO₂)

Shall I auto-book the optimal option or run a full lane analysis?`;

export default function AIModule() {
  const [msgs, setMsgs]       = useState<Msg[]>([{ role:'ai', text:"Hello! I'm TransportOS AI — powered by Claude. Ask me about route optimisation, delay prediction, cost reduction, or any logistics question." }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setTab]   = useState<'capabilities'|'insights'|'chat'|'optimise'>('capabilities');
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMsgs(m => [...m, { role:'user', text:userMsg }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setMsgs(m => [...m, { role:'ai', text:DEMO_RESP }]);
    setLoading(false);
  };

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="ai"
        icon="🧠"
        title="AI Engine"
        subtitle="TRANSPORTOS INTELLIGENCE"
        color="#ea580c"
        description="Six production AI models running in real-time. Route optimisation, demand forecasting, load optimisation, anomaly detection, carbon footprint reduction, and a natural-language logistics assistant."
        features={['Route optimisation ML model','30-day demand forecasting','Delay prediction (weather+traffic)','3D bin-packing load optimiser','Fraud & anomaly detection','Carbon footprint optimiser','Claude-powered AI chat','Real-time cost savings tracking']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          AI Engine <span style={{ color:'#ea580c' }}>TransportOS Intelligence</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Route AI · Demand forecasting · Anomaly detection · NLP assistant
        </p>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20 }}>
          {(['capabilities','insights','chat','optimise'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 18px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background:activeTab===t?'#ea580c':'rgba(255,255,255,0.04)',
              border:`1px solid ${activeTab===t?'#ea580c50':'rgba(255,255,255,0.06)'}`,
              color:activeTab===t?'#fff':'var(--text-muted)',
              transition:'all 0.15s', textTransform:'capitalize',
            }}>{t}</button>
          ))}
        </div>

        {/* CAPABILITIES */}
        {activeTab === 'capabilities' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {AI_CAPS.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.title} style={{
                  padding:'18px', borderRadius:14,
                  background:`${c.color}06`,
                  border:`1px solid ${c.color}20`,
                  position:'relative', overflow:'hidden',
                }}>
                  <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:`linear-gradient(90deg,transparent,${c.color},transparent)` }} />
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ padding:'9px', borderRadius:10, background:`${c.color}15` }}>
                      <Icon size={16} color={c.color} />
                    </div>
                    <span style={{
                      padding:'3px 8px', borderRadius:99, fontSize:9, fontWeight:700,
                      background:c.status==='Active'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)',
                      color:c.status==='Active'?'#10b981':'#f59e0b',
                    }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{c.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12, lineHeight:1.5 }}>{c.desc}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:c.color, fontFamily:'var(--font-mono)' }}>{c.metric}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* INSIGHTS */}
        {activeTab === 'insights' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>
              LIVE AI INSIGHTS — Updated every 30 seconds
            </div>
            {INSIGHTS.map((ins, i) => (
              <div key={i} style={{
                display:'flex', gap:14, padding:'16px',
                borderRadius:12, background:'rgba(12,18,32,0.85)',
                border:`1px solid ${inC[ins.type]}25`,
                animation:`fadeInUp 0.3s ease ${i*0.1}s both`,
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:inC[ins.type], flexShrink:0, marginTop:5, boxShadow:`0 0 8px ${inC[ins.type]}` }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, margin:'0 0 6px', lineHeight:1.6, color:'var(--text-primary)' }}>{ins.msg}</p>
                  <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{ins.time}</span>
                </div>
                <button style={{ padding:'5px 12px', borderRadius:6, background:`${inC[ins.type]}15`, border:`1px solid ${inC[ins.type]}30`, color:inC[ins.type], fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0, height:'fit-content' }}>
                  Act →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:12 }}>
            {/* Chat window */}
            <div style={{ borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(12,18,32,0.85)', display:'flex', flexDirection:'column', height:480 }}>
              {/* Header */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(234,88,12,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Bot size={16} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>TransportOS AI</div>
                  <div style={{ fontSize:10, color:'#10b981', fontFamily:'var(--font-mono)' }}>● Claude 3.5 · Online</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ display:'flex', gap:10, flexDirection:m.role==='user'?'row-reverse':'row', alignItems:'flex-start' }}>
                    <div style={{
                      width:28, height:28, borderRadius:8, flexShrink:0,
                      background:m.role==='ai'?'rgba(234,88,12,0.15)':'rgba(0,212,255,0.1)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {m.role==='ai' ? <Bot size={13} color="#ea580c"/> : <User size={13} color="#00d4ff"/>}
                    </div>
                    <div style={{
                      maxWidth:'75%', padding:'10px 14px', borderRadius:12,
                      background:m.role==='ai'?'rgba(255,255,255,0.04)':'rgba(0,212,255,0.06)',
                      border:`1px solid ${m.role==='ai'?'rgba(255,255,255,0.06)':'rgba(0,212,255,0.15)'}`,
                      fontSize:12, lineHeight:1.7, color:'var(--text-primary)',
                      whiteSpace:'pre-wrap',
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'rgba(234,88,12,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Bot size={13} color="#ea580c"/>
                    </div>
                    <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:4, alignItems:'center' }}>
                      {[0,1,2].map(d => (
                        <div key={d} style={{ width:6, height:6, borderRadius:'50%', background:'#ea580c', animation:`pulse-dot 1s ease-in-out ${d*0.15}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>

              {/* Input */}
              <div style={{ padding:'12px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:8, flexShrink:0 }}>
                <input value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&send()}
                  placeholder="Ask about routes, costs, delays, forecasts…"
                  style={{ flex:1, padding:'9px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'var(--text-primary)', fontSize:12, outline:'none' }}
                />
                <button onClick={send} style={{ padding:'9px 12px', background:'#ea580c', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <Send size={14} color="#fff"/>
                </button>
              </div>
            </div>

            {/* Quick prompts */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>QUICK PROMPTS</div>
              {[
                'Best route Mumbai → Delhi today?',
                'Which carriers are underperforming?',
                'Forecast demand for Bangalore lane next week',
                'Consolidate tomorrow\'s shipments',
                'Carbon footprint of current fleet?',
                'Predict delays for SHP-2849',
              ].map(p => (
                <button key={p} onClick={()=>{ setInput(p); setTab('chat'); }} style={{
                  padding:'10px 12px', borderRadius:8, cursor:'pointer',
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
                  color:'var(--text-secondary)', fontSize:12, textAlign:'left',
                  transition:'all 0.15s',
                }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(234,88,12,0.06)';(e.currentTarget as HTMLElement).style.borderColor='rgba(234,88,12,0.25)';(e.currentTarget as HTMLElement).style.color='#ea580c';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)';(e.currentTarget as HTMLElement).style.color='var(--text-secondary)';}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OPTIMISE */}
        {activeTab === 'optimise' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ padding:'20px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Run Route Optimisation</div>
              <FormInput label="Origin City" placeholder="e.g. Mumbai" value="" onChange={()=>{}} />
              <FormInput label="Destination City" placeholder="e.g. Delhi" value="" onChange={()=>{}} />
              <FormInput label="Weight (kg)" type="number" placeholder="e.g. 5000" value="" onChange={()=>{}} />
              <FormSelect label="Priority" options={['Lowest Cost','Fastest Time','Balanced','Lowest CO₂']} value="Balanced" onChange={()=>{}} />
              <FormSelect label="Preferred Mode" options={['Any','Road Only','Air Only','Rail Only','Road + Rail']} value="Any" onChange={()=>{}} />
              <SubmitBtn label="🚀 Run Optimisation" color="#ea580c" onClick={()=>setTab('chat')} />
            </div>
            <div style={{ padding:'20px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Demand Forecast</div>
              <FormSelect label="Lane" options={['MUM-DEL','BLR-CHN','HYD-PNQ','DEL-KOL','SRT-JPR','CHN-KOL']} value="MUM-DEL" onChange={()=>{}} />
              <FormInput label="Forecast Horizon (days)" type="number" placeholder="30" value="" onChange={()=>{}} />
              <FormSelect label="Include Seasonality" options={['Yes','No']} value="Yes" onChange={()=>{}} />
              <SubmitBtn label="📈 Generate Forecast" color="#7c3aed" onClick={()=>setTab('chat')} />
              <div style={{ marginTop:16, padding:'12px', borderRadius:8, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
                Results appear in the <strong style={{ color:'#7c3aed' }}>AI Chat</strong> tab with full reasoning.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
