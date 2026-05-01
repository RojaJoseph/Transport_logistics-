import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff } from 'lucide-react';

// ── Animated route map canvas ─────────────────────────────────────
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

    // Node positions (as % of canvas)
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

    // Moving packets along routes
    const packets: { edge: number; t: number; speed: number; color: string }[] = edges.map((_, i) => ({
      edge: i,
      t: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
      color: i % 3 === 0 ? '#00e5ff' : i % 3 === 1 ? '#00ff9d' : '#ff6b35',
    }));

    // Pulse rings on nodes
    const pulses: { node: number; r: number; alpha: number }[] = [];
    let pulseTimer = 0;

    let raf: number;
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const px = (n: { x: number; y: number }) => ({ x: n.x * W, y: n.y * H });

      // Draw edges
      edges.forEach(([a, b]) => {
        const pa = px(nodes[a]);
        const pb = px(nodes[b]);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = 'rgba(0,229,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw packets
      packets.forEach(p => {
        const [a, b] = edges[p.edge];
        const pa = px(nodes[a]);
        const pb = px(nodes[b]);
        const x = pa.x + (pb.x - pa.x) * p.t;
        const y = pa.y + (pb.y - pa.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        p.t = (p.t + p.speed) % 1;
      });

      // Draw pulse rings
      pulses.forEach((pulse, i) => {
        const n = px(nodes[pulse.node]);
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulse.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${pulse.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        pulse.r   += 0.8;
        pulse.alpha -= 0.012;
        if (pulse.alpha <= 0) pulses.splice(i, 1);
      });

      // Draw nodes
      nodes.forEach((node, i) => {
        const p = px(node);
        // glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.08)';
        ctx.fill();
        // dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        // label
        ctx.fillStyle = 'rgba(0,229,255,0.6)';
        ctx.font = '10px monospace';
        ctx.fillText(node.label, p.x + 8, p.y - 6);
      });

      // Spawn pulse
      pulseTimer++;
      if (pulseTimer % 60 === 0) {
        pulses.push({ node: Math.floor(Math.random() * nodes.length), r: 4, alpha: 0.6 });
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ── Stat ticker ───────────────────────────────────────────────────
const STATS = [
  { label: 'Active Shipments', value: '2,847' },
  { label: 'Routes Optimised', value: '14,203' },
  { label: 'On-Time Delivery', value: '98.4%' },
  { label: 'Fleet Utilisation', value: '91.2%' },
];

export default function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const [email,    setEmail]    = useState('admin@transportos.com');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [statIdx,  setStatIdx]  = useState(0);
  const [visible,  setVisible]  = useState(true);

  // Cycle stats
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setStatIdx(i => (i + 1) % STATS.length); setVisible(true); }, 400);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const status    = err?.response?.status;
      const serverMsg = err?.response?.data?.error;
      if (status === 401) {
        setError('Invalid credentials. Try: admin@transportos.com · any password.');
      } else if (status === 503 || !status) {
        setError('Services are waking up (free tier) — wait 30 s then retry.');
      } else {
        setError(serverMsg ?? 'Login failed. Please try again.');
      }
    }
  };

  const stat = STATS[statIdx];

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Barlow', 'Barlow Condensed', sans-serif",
      background: '#050a0f',
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .login-input {
          width: 100%; padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(0,229,255,0.15);
          border-radius: 8px;
          color: #e8f4f8; font-size: 14px;
          font-family: 'Barlow', sans-serif;
          outline: none; transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: rgba(0,229,255,0.6);
          background: rgba(0,229,255,0.04);
        }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }

        .stat-fade { transition: opacity 0.4s ease; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-up { animation: slideUp 0.7s ease forwards; }
        .animate-up-2 { animation: slideUp 0.7s 0.1s ease both; }
        .animate-up-3 { animation: slideUp 0.7s 0.2s ease both; }
        .animate-up-4 { animation: slideUp 0.7s 0.3s ease both; }

        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .btn-primary {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #00e5ff, #00b8d4);
          border: none; border-radius: 8px;
          color: #020d12; font-size: 14px; font-weight: 700;
          font-family: 'Barlow Condensed', sans-serif;
          letter-spacing: 2px; cursor: pointer;
          transition: all 0.2s; text-transform: uppercase;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #33eeff, #00d4f0);
          box-shadow: 0 0 30px rgba(0,229,255,0.4);
          transform: translateY(-1px);
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-sso {
          width: 100%; padding: 13px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; color: rgba(255,255,255,0.5);
          font-size: 13px; font-family: 'Barlow', sans-serif;
          cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px;
        }
        .btn-sso:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); }

        .scanline {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
          );
        }
      `}</style>

      {/* ── LEFT PANEL — Animated route map ── */}
      <div style={{
        flex: '1 1 55%', position: 'relative',
        background: 'linear-gradient(135deg, #061018 0%, #020c14 100%)',
        borderRight: '1px solid rgba(0,229,255,0.08)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: '100vh',
      }}>
        <div className="scanline" />

        {/* Top-left branding */}
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
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 20, letterSpacing: 4,
                color: '#e8f4f8',
              }}>
                TRANSPORT<span style={{ color: '#00e5ff' }}>OS</span>
              </div>
            </div>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'rgba(0,229,255,0.45)', letterSpacing: 3,
          }}>ENTERPRISE LOGISTICS PLATFORM</div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <RouteCanvas />

          {/* Centre headline */}
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

        {/* Bottom stat ticker */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '24px 40px',
          borderTop: '1px solid rgba(0,229,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 24,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#00ff9d',
            boxShadow: '0 0 8px #00ff9d',
          }} />
          <div className="stat-fade" style={{ opacity: visible ? 1 : 0 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'rgba(0,229,255,0.5)', letterSpacing: 2,
              textTransform: 'uppercase', marginBottom: 2,
            }}>{stat.label}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 28, color: '#e8f4f8', letterSpacing: 1,
            }}>{stat.value}</div>
          </div>
          {/* Mini progress dots */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {STATS.map((_, i) => (
              <div key={i} style={{
                width: i === statIdx ? 20 : 6, height: 6,
                borderRadius: 3,
                background: i === statIdx ? '#00e5ff' : 'rgba(0,229,255,0.2)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login form ── */}
      <div style={{
        flex: '0 0 420px', minHeight: '100vh',
        background: '#080f16',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle radial glow behind form */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div className="animate-up" style={{ marginBottom: 40 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: '#00e5ff',
              letterSpacing: 3, marginBottom: 12,
              opacity: 0.7,
            }}>SECURE ACCESS</div>
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 42,
              color: '#e8f4f8', margin: 0, lineHeight: 1,
              letterSpacing: -0.5,
            }}>Welcome<br/>back.</h1>
            <p style={{
              marginTop: 12, color: 'rgba(255,255,255,0.3)',
              fontSize: 14, fontFamily: "'Barlow', sans-serif",
            }}>Sign in to your workspace</p>
          </div>

          {/* Form fields */}
          <div className="animate-up-2" style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
            <div>
              <label style={{
                display: 'block', marginBottom: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: 2,
                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              }}>Email address</label>
              <input
                className="login-input"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{
                display: 'block', marginBottom: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: 2,
                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="login-input"
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Enter any password to demo"
                  style={{ paddingRight: 48 }}
                />
                <button
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                    padding: 0, transition: 'color 0.2s',
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,229,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                >
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
          </div>

          {/* Demo hint */}
          <div className="animate-up-3" style={{
            marginBottom: 20,
            padding: '10px 14px',
            background: 'rgba(0,229,255,0.05)',
            border: '1px solid rgba(0,229,255,0.12)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff9d', flexShrink: 0 }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'rgba(0,229,255,0.6)', letterSpacing: 0.5,
            }}>
              demo: <span style={{ color: '#00e5ff' }}>admin@transportos.com</span> · any password
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(255,50,50,0.07)',
              border: '1px solid rgba(255,50,50,0.2)',
              borderRadius: 8,
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13, color: '#ff6b6b',
            }}>{error}</div>
          )}

          {/* CTA */}
          <div className="animate-up-3">
            <button className="btn-primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'AUTHENTICATING...' : 'SIGN IN →'}
            </button>
          </div>

          {/* Divider + SSO */}
          <div className="animate-up-4" style={{ marginTop: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 12, color: 'rgba(255,255,255,0.2)',
              }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>
            <button className="btn-sso">🔑 &nbsp; Continue with SSO / Keycloak</button>
          </div>

          {/* Footer trust badges */}
          <div className="animate-up-4" style={{
            marginTop: 36, paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            {['AES-256', 'TLS 1.3', 'Zero-Trust'].map(badge => (
              <span key={badge} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'rgba(255,255,255,0.18)',
                letterSpacing: 1,
              }}>✦ {badge}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
