import { useState, useEffect } from 'react';
import { Bell, Search, Wifi, WifiOff, ChevronDown, Command } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

export default function Topbar() {
  const { user }        = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [online, setOnline] = useState(navigator.onLine);
  const [time,   setTime]   = useState(new Date());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { clearInterval(tick); window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  return (
    <header style={{
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 20px',
      background: 'rgba(8,13,20,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <Search size={13} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
        }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search shipments, orders, routes..."
          className="input"
          style={{ paddingLeft: 34, paddingRight: 60, fontSize: 12 }}
        />
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 4,
          padding: '2px 5px',
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          <Command size={9} />K
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Live status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          borderRadius: 8,
          background: online ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${online ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {online
            ? <Wifi size={11} color="var(--success)" />
            : <WifiOff size={11} color="var(--danger)" />}
          <span style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em',
            color: online ? 'var(--success)' : 'var(--danger)',
            fontFamily: 'var(--font-mono)',
          }}>
            {online ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Clock */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          padding: '5px 10px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          letterSpacing: '0.06em',
          minWidth: 70,
          textAlign: 'center',
        }}>
          {time.toLocaleTimeString('en-IN', { hour12: false })}
        </div>

        {/* Tenant badge */}
        <div style={{
          padding: '5px 10px',
          borderRadius: 8,
          background: 'var(--accent-dim)',
          border: '1px solid rgba(0,212,255,0.15)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--accent)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}>
          {user?.tenant ?? 'ENTERPRISE'}
        </div>

        {/* Notifications */}
        <button
          className="btn btn-ghost btn-icon"
          style={{
            position: 'relative',
            padding: 8,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <Bell size={15} color="var(--text-secondary)" />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 3, right: 3,
              width: 16, height: 16,
              background: 'var(--danger)',
              borderRadius: '50%',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 8px rgba(239,68,68,0.5)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User pill */}
        <button
          className="btn btn-ghost"
          style={{
            gap: 8, padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{
            width: 22, height: 22,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #00d4ff30, #00d4ff15)',
            border: '1px solid rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--accent)',
          }}>
            {user?.name?.charAt(0) ?? 'A'}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {user?.name?.split(' ')[0] ?? 'Admin'}
          </span>
          <ChevronDown size={11} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  );
}
