import { useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Settings, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';

const CHANNELS = [
  { icon: Mail,          label: 'Email',        sub: 'SendGrid SMTP',  status: 'Active', color: '#00e5ff' },
  { icon: MessageSquare, label: 'SMS',           sub: 'Twilio',         status: 'Active', color: '#7c3aed' },
  { icon: Smartphone,    label: 'Push (FCM)',    sub: 'Firebase',       status: 'Active', color: '#ff6b2b' },
  { icon: Bell,          label: 'In-App',        sub: 'WebSocket',      status: 'Active', color: '#00e676' },
];

const TEMPLATES = [
  { id: 'TPL-001', name: 'Shipment Dispatched',   triggers: 'On dispatch',     channels: ['Email','SMS','Push'] },
  { id: 'TPL-002', name: 'Delivery Completed',    triggers: 'On delivery',     channels: ['Email','Push'] },
  { id: 'TPL-003', name: 'Delay Alert',           triggers: 'SLA breach risk', channels: ['Email','SMS','Push','In-App'] },
  { id: 'TPL-004', name: 'Invoice Generated',     triggers: 'Finance event',   channels: ['Email'] },
  { id: 'TPL-005', name: 'Route Changed',         triggers: 'Route update',    channels: ['SMS','Push'] },
  { id: 'TPL-006', name: 'Exception Detected',    triggers: 'AI anomaly',      channels: ['Email','SMS','Push','In-App'] },
];

const chColor: Record<string, string> = { Email: '#00e5ff', SMS: '#7c3aed', Push: '#ff6b2b', 'In-App': '#00e676' };

export default function NotificationsModule() {
  const { notifications, markAllRead, clearAll, unreadCount } = useNotificationStore();
  const [tab, setTab] = useState<'feed'|'channels'|'templates'|'settings'>('feed');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Notifications <span style={{ color: '#9333ea' }}>Multi-Channel Hub</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Email · SMS · Push · In-App · Webhooks · Event rules</p>
      </div>

      {/* Channel status */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {CHANNELS.map(({ icon: Icon, label, sub, status, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(color)},0.25)` }}>
            <div className="p-2.5 rounded-xl" style={{ background: `rgba(${hexToRgb(color)},0.12)` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <div className="text-sm font-bold">{label}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full live-dot" style={{ background: color }} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {(['feed','channels','templates','settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide capitalize transition-all"
            style={{ background: tab === t ? '#9333ea' : 'transparent', color: tab === t ? '#fff' : 'var(--color-text-muted)' }}>
            {t === 'feed' ? `Feed ${unreadCount > 0 ? `(${unreadCount})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold tracking-widest" style={{ color: 'var(--color-text-muted)' }}>NOTIFICATION FEED</span>
            <div className="flex gap-2">
              <button onClick={markAllRead} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <CheckCheck size={12} /> Mark all read
              </button>
              <button onClick={clearAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Bell size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="font-semibold">No notifications</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Events from all modules will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-4 rounded-xl transition-all"
                  style={{ background: 'var(--color-surface)', border: `1px solid ${n.read ? 'var(--color-border)' : 'rgba(147,51,234,0.3)'}`, opacity: n.read ? 0.7 : 1 }}>
                  {!n.read && <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#9333ea' }} />}
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{n.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{n.message}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {n.module} · {n.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                {['Template ID','Name','Trigger','Channels',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEMPLATES.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-mono" style={{ color: '#9333ea' }}>{t.id}</td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{t.triggers}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {t.channels.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: `rgba(${hexToRgb(chColor[c])},0.12)`, color: chColor[c] }}>{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-2 py-1 rounded text-xs font-semibold" style={{ background: 'var(--color-surface-2)', color: '#9333ea', border: '1px solid var(--color-border)' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(tab === 'channels' || tab === 'settings') && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Settings size={32} className="mx-auto mb-3" style={{ color: '#9333ea' }} />
          <h2 className="font-bold text-lg">
            {tab === 'channels' ? 'Channel Configuration' : 'Notification Settings'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Configure API keys, rate limits, and delivery rules</p>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}`;
}
