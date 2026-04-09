import { useState } from 'react';
import { Shield, CheckCircle, XCircle, Lock } from 'lucide-react';

const USERS = [
  { id: 'USR-001', name: 'Arjun Sharma',    email: 'arjun.sharma@company.com',   role: 'SUPER_ADMIN',   mfa: true,  status: 'Active',   last: '2 min ago' },
  { id: 'USR-002', name: 'Priya Nair',      email: 'priya.nair@company.com',     role: 'OPS_MANAGER',   mfa: true,  status: 'Active',   last: '18 min ago' },
  { id: 'USR-003', name: 'Ravi Kumar',      email: 'ravi.kumar@company.com',     role: 'LOGISTICS_EXEC',mfa: false, status: 'Active',   last: '1h ago' },
  { id: 'USR-004', name: 'Deepa Menon',     email: 'deepa.menon@company.com',    role: 'FINANCE_ADMIN', mfa: true,  status: 'Active',   last: '3h ago' },
  { id: 'USR-005', name: 'Suresh Pillai',   email: 'suresh.pillai@company.com',  role: 'DRIVER',        mfa: false, status: 'Inactive', last: '2d ago' },
  { id: 'USR-006', name: 'Ananya Singh',    email: 'ananya.singh@company.com',   role: 'ANALYST',       mfa: true,  status: 'Active',   last: '45 min ago' },
];

const roleColor: Record<string, string> = {
  SUPER_ADMIN:    '#ff1744',
  OPS_MANAGER:    '#7c3aed',
  LOGISTICS_EXEC: '#00e5ff',
  FINANCE_ADMIN:  '#ffab00',
  DRIVER:         '#00e676',
  ANALYST:        '#ff6b2b',
};

const AUDIT_LOG = [
  { time: '14:32:11', user: 'Arjun Sharma',  action: 'PERMISSION_GRANT',  detail: 'Granted FINANCE_VIEW to Ananya Singh',  risk: 'low' },
  { time: '14:28:04', user: 'Priya Nair',    action: 'USER_LOGIN',        detail: 'Successful login from 103.21.x.x (Chennai)', risk: 'low' },
  { time: '13:55:42', user: 'Unknown',        action: 'FAILED_LOGIN',      detail: '5 failed attempts on ravi.kumar@company.com', risk: 'high' },
  { time: '13:20:19', user: 'Deepa Menon',   action: 'EXPORT_DATA',       detail: 'Finance report exported (Q1 2025)',       risk: 'medium' },
  { time: '12:10:33', user: 'Suresh Pillai', action: 'USER_DEACTIVATED',  detail: 'Account deactivated by Arjun Sharma',    risk: 'medium' },
];

const riskColor: Record<string, string> = { low: '#00e676', medium: '#ffab00', high: '#ff1744' };

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return '255,255,255';
  return `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}`;
}

export default function IdentityModule() {
  const [tab, setTab] = useState<'users'|'roles'|'audit'|'mfa'>('users');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Identity & Security <span style={{ color: '#dc2626' }}>Zero-Trust</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>OAuth 2.0 · RBAC · MFA · Audit logs · Keycloak</p>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users',      value: '142',   color: '#00e5ff', sub: '6 admins' },
          { label: 'Active Sessions',  value: '38',    color: '#00e676', sub: 'across 12 IPs' },
          { label: 'MFA Adoption',     value: '76%',   color: '#ffab00', sub: '108 / 142 users' },
          { label: 'Threat Alerts',    value: '3',     color: '#ff1744', sub: 'in last 24h' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(color)},0.25)` }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{label.toUpperCase()}</div>
            <div className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {(['users','roles','audit','mfa'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all capitalize"
            style={{ background: tab === t ? 'var(--color-accent)' : 'transparent', color: tab === t ? '#000' : 'var(--color-text-muted)' }}>
            {t === 'mfa' ? 'MFA' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                {['User','Email','Role','MFA','Status','Last Active',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-border)', color: 'var(--color-accent)' }}>
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: `rgba(${hexToRgb(roleColor[u.role])},0.12)`, color: roleColor[u.role] }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.mfa ? <CheckCircle size={14} style={{ color: '#00e676' }} /> : <XCircle size={14} style={{ color: '#ff1744' }} />}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: u.status === 'Active' ? 'rgba(0,230,118,0.1)' : 'rgba(255,171,0,0.1)', color: u.status === 'Active' ? '#00e676' : '#ffab00' }}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{u.last}</td>
                  <td className="px-4 py-3">
                    <button className="px-2 py-1 rounded text-xs font-semibold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Tab */}
      {tab === 'audit' && (
        <div className="space-y-2">
          {AUDIT_LOG.map((log, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(riskColor[log.risk])},0.2)` }}>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', minWidth: 70 }}>{log.time}</span>
              <span className="text-xs font-semibold" style={{ color: riskColor[log.risk], minWidth: 140 }}>{log.action}</span>
              <span className="text-xs font-medium" style={{ minWidth: 120 }}>{log.user}</span>
              <span className="text-xs flex-1" style={{ color: 'var(--color-text-muted)' }}>{log.detail}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                style={{ background: `rgba(${hexToRgb(riskColor[log.risk])},0.12)`, color: riskColor[log.risk] }}>
                {log.risk}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'roles' && (
        <div className="rounded-xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(roleColor).map(([role, color]) => (
              <div key={role} className="p-4 rounded-xl" style={{ border: `1px solid rgba(${hexToRgb(color)},0.25)`, background: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} style={{ color }} />
                  <span className="text-xs font-bold" style={{ color }}>{role}</span>
                </div>
                <div className="space-y-1">
                  {['Dashboard', 'Orders', 'Finance', 'Reports', 'Admin'].map((p, pi) => (
                    <div key={p} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--color-text-muted)' }}>{p}</span>
                      {pi < (role === 'SUPER_ADMIN' ? 5 : role === 'OPS_MANAGER' ? 4 : 2)
                        ? <CheckCircle size={11} style={{ color: '#00e676' }} />
                        : <XCircle size={11} style={{ color: 'var(--color-border)' }} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'mfa' && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Lock size={36} className="mx-auto mb-3" style={{ color: '#dc2626' }} />
          <h2 className="font-bold text-lg mb-2">Multi-Factor Authentication</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>76% adoption — enforce MFA for remaining 34 users</p>
          <div className="flex gap-3 justify-center">
            <button className="px-5 py-2 rounded-xl text-sm font-bold" style={{ background: '#dc2626', color: '#fff' }}>Enforce MFA Policy</button>
            <button className="px-5 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>Send Reminders</button>
          </div>
        </div>
      )}
    </div>
  );
}
