import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Truck } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail]       = useState('admin@transportos.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('Invalid credentials. Use any password to demo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-display)' }}>

      {/* Background grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(var(--color-accent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
              <Truck size={20} style={{ color: '#000' }} />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold tracking-widest">TRANSPORT<span style={{ color: 'var(--color-accent)' }}>OS</span></div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>ENTERPRISE LOGISTICS PLATFORM</div>
            </div>
          </div>
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 glow" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)' }}>EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)' }}>PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
                  placeholder="Enter any password to demo"
                />
                <button onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,23,68,0.1)', color: '#ff1744', border: '1px solid rgba(255,23,68,0.2)' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#000' }}>
              {isLoading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </div>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="text-xs text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>— or continue with —</div>
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              🔑 &nbsp;SSO / Keycloak
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
          Protected by AES-256 · TLS 1.3 · Zero-Trust architecture
        </p>
      </div>
    </div>
  );
}
