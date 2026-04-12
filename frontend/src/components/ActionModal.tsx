import { useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ActionModalProps {
  title: string;
  color?: string;
  trigger: ReactNode;
  children: ReactNode;
}

export function ActionModal({ title, color = '#00d4ff', trigger, children }: ActionModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor:'pointer' }}>{trigger}</div>
      {open && (
        <div style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(3,5,8,0.8)',
          backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'fadeIn 0.2s ease',
        }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 480, maxHeight:'80vh', overflow:'auto',
            background:'rgba(12,18,32,0.98)',
            border:`1px solid ${color}25`,
            borderRadius:16, padding:'24px',
            boxShadow:`0 0 40px ${color}15, 0 20px 60px rgba(0,0,0,0.8)`,
            animation:'scaleIn 0.2s ease',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-display)', margin:0 }}>{title}</h3>
              <button onClick={() => setOpen(false)} style={{
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:6, padding:'5px', cursor:'pointer', display:'flex',
              }}>
                <X size={13} color="var(--text-muted)" />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

// Reusable form input
export function FormInput({ label, placeholder, type='text', value, onChange }: {
  label:string; placeholder?:string; type?:string; value:string; onChange:(v:string)=>void;
}) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--font-mono)' }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', padding:'9px 12px',
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:8, color:'var(--text-primary)', fontSize:13,
          outline:'none', fontFamily:'var(--font-sans)',
          boxSizing:'border-box',
        }}
        onFocus={e => (e.target.style.borderColor = '#00d4ff')}
        onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
      />
    </div>
  );
}

export function FormSelect({ label, options, value, onChange }: {
  label:string; options:string[]; value:string; onChange:(v:string)=>void;
}) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--font-mono)' }}>
        {label}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          width:'100%', padding:'9px 12px',
          background:'rgba(12,18,32,0.95)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:8, color:'var(--text-primary)', fontSize:13, outline:'none',
        }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function SubmitBtn({ label, color='#00d4ff', onClick }: { label:string; color?:string; onClick:()=>void }) {
  const [done, setDone] = useState(false);
  const handle = () => { setDone(true); setTimeout(() => setDone(false), 2000); onClick(); };
  return (
    <button onClick={handle} style={{
      width:'100%', padding:'11px',
      background: done ? '#10b981' : `linear-gradient(135deg, ${color}, ${color}bb)`,
      border:'none', borderRadius:8,
      color:'#000', fontSize:13, fontWeight:700, cursor:'pointer',
      transition:'all 0.3s',
      boxShadow: done ? '0 0 16px #10b98155' : `0 0 16px ${color}40`,
    }}>
      {done ? '✓ Done!' : label}
    </button>
  );
}
