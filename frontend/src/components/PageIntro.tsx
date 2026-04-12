import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PageIntroProps {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  color: string;
  storageKey: string;
}

export default function PageIntro({ icon, title, subtitle, description, features, color, storageKey }: PageIntroProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`intro_${storageKey}`);
    if (!seen) setShow(true);
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(`intro_${storageKey}`, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(3,5,8,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.25s ease',
    }} onClick={dismiss}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          background: 'linear-gradient(135deg, rgba(12,18,32,0.98) 0%, rgba(8,13,20,0.99) 100%)',
          border: `1px solid ${color}30`,
          borderRadius: 20,
          padding: '32px',
          position: 'relative',
          boxShadow: `0 0 60px ${color}20, 0 24px 80px rgba(0,0,0,0.8)`,
          animation: 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        {/* Top accent line */}
        <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:1, background:`linear-gradient(90deg,transparent,${color},transparent)`, borderRadius:99 }} />

        {/* Close */}
        <button onClick={dismiss} style={{
          position:'absolute', top:16, right:16,
          background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:8, padding:'6px', cursor:'pointer', display:'flex', alignItems:'center',
        }}>
          <X size={14} color="var(--text-muted)" />
        </button>

        {/* Icon + Title */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{
            width:56, height:56,
            background:`linear-gradient(135deg, ${color}20, ${color}08)`,
            border:`1px solid ${color}30`,
            borderRadius:16,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26,
            boxShadow:`0 0 20px ${color}20`,
          }}>
            {icon}
          </div>
          <div>
            <h2 style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:0 }}>
              {title}
            </h2>
            <p style={{ fontSize:12, color, margin:'4px 0 0', fontFamily:'var(--font-mono)', fontWeight:600, letterSpacing:'0.05em' }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
          {description}
        </p>

        {/* Features */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 12px',
              background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.05)',
              borderRadius:8,
            }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={dismiss} style={{
          width:'100%', padding:'12px',
          background:`linear-gradient(135deg, ${color}, ${color}bb)`,
          border:'none', borderRadius:10,
          color:'#000', fontSize:13, fontWeight:700,
          cursor:'pointer', letterSpacing:'0.04em',
          boxShadow:`0 0 20px ${color}40`,
          transition:'all 0.2s',
        }}>
          Got it — Let's go →
        </button>
      </div>
    </div>
  );
}
