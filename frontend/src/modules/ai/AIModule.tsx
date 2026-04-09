import { useState } from 'react';
import { Brain, Zap, TrendingUp, Route, AlertTriangle, RefreshCw, Send, Bot, User } from 'lucide-react';

const AI_CAPABILITIES = [
  { title: 'Route Optimisation',     desc: 'ML-powered shortest path with cost & time balance', status: 'Active',  savings: '₹12.8L/mo', color: '#00e5ff' },
  { title: 'Demand Forecasting',     desc: '30-day shipment volume forecast per lane',           status: 'Active',  savings: '₹6.2L/mo',  color: '#7c3aed' },
  { title: 'Delay Prediction',       desc: 'Weather + traffic + port congestion risk model',     status: 'Active',  savings: 'SLA saved',  color: '#ff6b2b' },
  { title: 'Load Optimisation',      desc: 'Bin-packing AI maximises vehicle utilisation',       status: 'Active',  savings: '22% fuel ↓', color: '#00e676' },
  { title: 'Anomaly Detection',      desc: 'Detects fraud, route deviation & sensor faults',     status: 'Active',  savings: 'Risk ↓',     color: '#ff1744' },
  { title: 'Carbon Optimiser',       desc: 'Selects lowest-emission transport mix',              status: 'Beta',    savings: '18% CO₂ ↓',  color: '#ffab00' },
];

const INSIGHTS = [
  { type: 'warning', msg: 'Route MUM→DEL: predicted 3h delay (cyclone advisory). Alternate via Jaipur saves 1.2h.' },
  { type: 'success', msg: 'Load consolidation detected: SHP-2853 + SHP-2854 can share TN-09 vehicle → ₹18,400 saved.' },
  { type: 'info',    msg: 'Demand spike forecast: Bangalore corridor +34% next week (festive season). Pre-book capacity.' },
  { type: 'warning', msg: 'Carrier DTDC: on-time rate dropped to 81% this month. Consider reallocation.' },
];

const insightColor: Record<string, string> = { warning: '#ffab00', success: '#00e676', info: '#00e5ff' };

interface ChatMessage { role: 'user' | 'ai'; text: string; }

const SAMPLE_RESPONSES: Record<string, string> = {
  default: "I've analysed your query. Based on current shipment data, traffic patterns and carrier performance, here is my recommendation:\n\n• Route MUM→DEL via NH-48 has 87% on-time probability\n• Estimated cost: ₹24,500 | Estimated time: 14h 20m\n• Alternative: Air freight (₹68,000, 2h 10m)\n\nWould you like me to auto-book the optimal option?",
};

export default function AIModule() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Hello! I\'m TransportOS AI. Ask me about route optimisation, delay prediction, cost reduction, or any logistics question.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setMessages(m => [...m, { role: 'ai', text: SAMPLE_RESPONSES.default }]);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">AI Engine <span style={{ color: '#ea580c' }}>TransportOS Intelligence</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Route AI · Demand forecasting · Anomaly detection · NLP assistant</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {AI_CAPABILITIES.map((c) => (
          <div key={c.title} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(c.color)},0.2)` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: c.color }}>{c.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: c.status === 'Active' ? 'rgba(0,230,118,0.1)' : 'rgba(255,171,0,0.1)', color: c.status === 'Active' ? '#00e676' : '#ffab00' }}>
                {c.status}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>{c.desc}</p>
            <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: c.color }}>{c.savings}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* AI Insights */}
        <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} style={{ color: '#ea580c' }} />
            <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>LIVE AI INSIGHTS</span>
          </div>
          <div className="space-y-3">
            {INSIGHTS.map((ins, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: 'var(--color-surface-2)', border: `1px solid rgba(${hexToRgb(insightColor[ins.type])},0.2)` }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 live-dot" style={{ background: insightColor[ins.type] }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>{ins.msg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Chat */}
        <div className="rounded-xl flex flex-col" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: 420 }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Bot size={15} style={{ color: '#ea580c' }} />
            <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>AI ASSISTANT</span>
            <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ fontFamily: 'var(--font-mono)', color: '#00e676' }}>
              <div className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#00e676' }} /> GPT-4o · Claude 3.5
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="p-1.5 rounded-lg shrink-0 h-fit" style={{ background: m.role === 'ai' ? 'rgba(234,88,12,0.15)' : 'var(--color-accent-dim)' }}>
                  {m.role === 'ai' ? <Bot size={12} style={{ color: '#ea580c' }} /> : <User size={12} style={{ color: 'var(--color-accent)' }} />}
                </div>
                <div className="px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[80%] whitespace-pre-line"
                  style={{ background: m.role === 'ai' ? 'var(--color-surface-2)' : 'var(--color-accent-dim)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="p-1.5 rounded-lg h-fit" style={{ background: 'rgba(234,88,12,0.15)' }}><Bot size={12} style={{ color: '#ea580c' }} /></div>
                <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#ea580c', animationDelay: `${d*150}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about routes, costs, delays..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg outline-none"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <button onClick={sendMessage} className="p-2 rounded-lg" style={{ background: '#ea580c' }}>
              <Send size={13} style={{ color: '#fff' }} />
            </button>
          </div>
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
