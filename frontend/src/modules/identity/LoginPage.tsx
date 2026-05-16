import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// ── Animated route-map canvas (unchanged) ────────────────────────
function RouteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes = [
      { x: 0.15, y: 0.20, label: 'Delhi' },
      { x: 0.55, y: 0.13, label: 'Mumbai' },
      { x: 0.80, y: 0.35, label: 'Chennai' },
      { x: 0.30, y: 0.50, label: 'Hyderabad' },
      { x: 0.70, y: 0.65, label: 'Kolkata' },
      { x: 0.20, y: 0.78, label: 'Pune' },
      { x: 0.88, y: 0.80, label: 'Bangalore' },
      { x: 0.50, y: 0.88, label: 'Ahmedabad' },
    ];

    const edges = [
      [0,1],[1,2],[2,3],[3,0],[3,4],[4,6],[5,7],[6,7],[1,3],[0,5],[2,6],
    ];

    const packets = edges.map((_, i) => ({
      edge: i, t: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
      color: i % 3 === 0 ? '#00e5ff' : i % 3 === 1 ? '#00ff9d' : '#ff6b35',
    }));

    const pulses: { node: number; r: number; alpha: number }[] = [];
    let pulseTimer = 0;
    let raf: number;

    const draw = () => {
      const W = canvas.width; const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const px = (n: { x: number; y: number }) => ({ x: n.x * W, y: n.y * H });

      edges.forEach(([a, b]) => {
        const pa = px(nodes[a]); const pb = px(nodes[b]);
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = 'rgba(0,229,255,0.12)'; ctx.lineWidth = 1; ctx.stroke();
      });

      packets.forEach(p => {
        const [a, b] = edges[p.edge];
        const pa = px(nodes[a]); const pb = px(nodes[b]);
        const x = pa.x + (pb.x - pa.x) * p.t;
        const y = pa.y + (pb.y - pa.y) * p.t;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.fill(); ctx.shadowBlur = 0;
        p.t = (p.t + p.speed) % 1;
      });

      pulses.forEach((pulse, i) => {
        const n = px(nodes[pulse.node]);
        ctx.beginPath(); ctx.arc(n.x, n.y, pulse.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${pulse.alpha})`;
        ctx.lineWidth = 1; ctx.stroke();
        pulse.r += 0.8; pulse.alpha -= 0.012;
        if (pulse.alpha <= 0) pulses.splice(i, 1);
      });

      nodes.forEach(node => {
        const p = px(node);
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.08)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,229,255,0.6)'; ctx.font = '10px monospace';
        ctx.fillText(node.label, p.x + 8, p.y - 6);
      });

      pulseTimer++;
      if (pulseTimer % 60 === 0)
        pulses.push({ node: Math.floor(Math.random() * nodes.length), r: 4, alpha: 0.6 });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ── Stat ticker ───────────────────────────────────────────────────
const STATS = [
  { label: 'Active Shipments',  value: '2,847' },
  { label: 'Routes Optimised',  value: '14,203' },
  { label: 'On-Time Delivery',  value: '98.4%' },
  { label: 'Fleet Utilisation', value: '91.2%' },
];

// ── Main page ─────────────────────────────────────────────────────
export default function LoginPage() {
  const { guestLogin, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [statIdx, setStatIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pressed, setPressed] = useState(false);

  // Redirect if already in
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Cycle stats
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setStatIdx(i => (i + 1) % STATS.length); setVisible(true); }, 400);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const handleExplore = () => {
    setPressed(true);
    guestLogin();
    navigate('/dashboard', { replace: true });
  };

  const stat = STATS[statIdx];

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Barlow', 'Barlow Condensed', sans-serif",
      background: '#050a0f',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .stat-fade { transition: opacity 0.4s ease; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-up   { animation: slideUp 0.7s ease forwards; }
        .animate-up-2 { animation: slideUp 0.7s 0.12s ease both; }
        .animate-up-3 { animation: slideUp 0.7s 0.24s ease both; }

        .scanline {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
          );
        }

        /* Explore button */
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(0,229,255,0.35), 0 0 60px rgba(0,229,255,0.10); }
          50%       { box-shadow: 0 0 40px rgba(0,229,255,0.60), 0 0 80px rgba(0,229,255,0.20); }
        }
        .btn-explore {
          position: relative; overflow: hidden;
          width: 100%; padding: 20px 0;
          background: linear-gradient(135deg, #00e5ff 0%, #0097a7 100%);
          border: none; border-radius: 12px;
          color: #020d12; font-size: 18px; font-weight: 900;
          font-family: 'Barlow Condensed', sans-serif;
          letter-spacing: 4px; cursor: pointer;
          animation: glow-pulse 2.4s ease-in-out infinite;
          transition: transform 0.15s, filter 0.15s;
          text-transform: uppercase;
        }
        .btn-explore:hover { transform: translateY(-2px); filter: brightness(1.12); }
        .btn-explore:active { transform: translateY(0); filter: brightness(0.95); }
        .btn-explore::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .btn-explore:hover::after { transform: translateX(100%); }

        /* Chip badges */
        .chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px;
          border: 1px solid rgba(0,229,255,0.18);
          border-radius: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 1.5px;
          color: rgba(0,229,255,0.55);
          background: rgba(0,229,255,0.04);
        }
        .chip-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #00ff9d; box-shadow: 0 0 6px #00ff9d;
        }
      `}</style>

      {/* ── LEFT PANEL — Animated map ── */}
      <div style={{
        flex: '1 1 55%', position: 'relative',
        background: 'linear-gradient(135deg, #061018 0%, #020c14 100%)',
        borderRight: '1px solid rgba(0,229,255,0.08)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: '100vh',
      }}>
        <div className="scanline" />

        {/* Branding */}
        <div style={{ position: 'relative', zIndex: 2, padding: '36px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #00e5ff, #0097a7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" stroke="#020d12" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="5.5" cy="18.5" r="2.5" stroke="#020d12" strokeWidth="2"/>
                <circle cx="18.5" cy="18.5" r="2.5" stroke="#020d12" strokeWidth="2"/>
              </svg>
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 20, letterSpacing: 4, color: '#e8f4f8',
            }}>TRANSPORT<span style={{ color: '#00e5ff' }}>OS</span></div>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'rgba(0,229,255,0.45)', letterSpacing: 3,
          }}>ENTERPRISE LOGISTICS PLATFORM</div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <RouteCanvas />
          <div style={{
            position: 'absolute', bottom: '30%', left: 40, right: 40,
            zIndex: 2, pointerEvents: 'none',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 52, lineHeight: 1,
              color: '#e8f4f8', letterSpacing: -1,
            }}>
              MOVE FREIGHT<br/>
              <span style={{ color: '#00e5ff' }}>SMARTER.</span>
            </div>
            <p style={{
              marginTop: 16, color: 'rgba(255,255,255,0.35)',
              fontSize: 14, fontFamily: "'Barlow', sans-serif",
              fontWeight: 300, lineHeight: 1.6, maxWidth: 340,
            }}>
              Real-time visibility across every shipment,
              route, and warehouse — in one unified platform.
            </p>
          </div>
        </div>

        {/* Stat ticker */}
        <div style={{
          position: 'relative', zIndex: 2, padding: '24px 40px',
          borderTop: '1px solid rgba(0,229,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 24,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#00ff9d', boxShadow: '0 0 8px #00ff9d',
          }} />
          <div className="stat-fade" style={{ opacity: visible ? 1 : 0 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'rgba(0,229,255,0.5)',
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2,
            }}>{stat.label}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 28, color: '#e8f4f8', letterSpacing: 1,
            }}>{stat.value}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {STATS.map((_, i) => (
              <div key={i} style={{
                width: i === statIdx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === statIdx ? '#00e5ff' : 'rgba(0,229,255,0.2)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Explore CTA ── */}
      <div style={{
        flex: '0 0 420px', minHeight: '100vh',
        background: '#080f16',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div className="animate-up" style={{ marginBottom: 36 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: '#00e5ff',
              letterSpacing: 3, marginBottom: 14, opacity: 0.7,
            }}>LIVE DEMO</div>

            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 46,
              color: '#e8f4f8', margin: 0, lineHeight: 1, letterSpacing: -0.5,
            }}>
              See it in<br/>
              <span style={{ color: '#00e5ff' }}>action.</span>
            </h1>

            <p style={{
              marginTop: 16, color: 'rgba(255,255,255,0.35)',
              fontSize: 15, fontFamily: "'Barlow', sans-serif",
              fontWeight: 300, lineHeight: 1.7,
            }}>
              No sign-up. No password.<br/>
              Jump straight into the full platform.
            </p>
          </div>

          {/* Feature chips */}
          <div className="animate-up-2" style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 40,
          }}>
            {[
              'Live Tracking', 'Fleet Management', 'ERP & Inventory',
              'Finance & Invoicing', 'AI Insights', 'Analytics',
            ].map(f => (
              <span key={f} className="chip">
                <span className="chip-dot" />
                {f}
              </span>
            ))}
          </div>

          {/* The one big button */}
          <div className="animate-up-3">
            <button
              className="btn-explore"
              onClick={handleExplore}
              disabled={pressed}
            >
              {pressed ? 'LOADING...' : '⚡ EXPLORE PLATFORM →'}
            </button>
          </div>

          {/* Footer note */}
          <div style={{
            marginTop: 28, textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'rgba(255,255,255,0.18)',
            letterSpacing: 1, lineHeight: 1.8,
          }}>
            DEMO MODE · READ-ONLY SAFE · NO DATA STORED
          </div>

          {/* Trust badges */}
          <div style={{
            marginTop: 32, paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            {['AES-256', 'TLS 1.3', 'Zero-Trust'].map(badge => (
              <span key={badge} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: 1,
              }}>✦ {badge}</span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
