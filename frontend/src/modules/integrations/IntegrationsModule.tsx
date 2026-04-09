import { useState } from 'react';
import { Plug, CheckCircle, XCircle, RefreshCw, Zap, Globe, Database, Cloud } from 'lucide-react';

const INTEGRATIONS = [
  { id: 'INT-001', name: 'SAP S/4HANA',       type: 'ERP',       protocol: 'RFC/BAPI', status: 'Connected', lastSync: '2 min ago',  icon: '🏢', color: '#00e5ff' },
  { id: 'INT-002', name: 'project44',          type: 'Tracking',  protocol: 'REST',     status: 'Connected', lastSync: '30 sec ago', icon: '📍', color: '#16a34a' },
  { id: 'INT-003', name: 'BlueDart API',        type: 'Carrier',   protocol: 'REST',     status: 'Connected', lastSync: '5 min ago',  icon: '✈️', color: '#2563eb' },
  { id: 'INT-004', name: 'DTDC EDI',           type: 'EDI',       protocol: 'X12/EDIFACT',status:'Connected',lastSync: '1h ago',    icon: '📋', color: '#7c3aed' },
  { id: 'INT-005', name: 'Stripe Billing',     type: 'Finance',   protocol: 'REST',     status: 'Connected', lastSync: '10 min ago', icon: '💳', color: '#ffab00' },
  { id: 'INT-006', name: 'Delhivery',          type: 'Carrier',   protocol: 'REST',     status: 'Error',     lastSync: '2h ago',     icon: '🚚', color: '#ff1744' },
  { id: 'INT-007', name: 'FedEx Web Services', type: 'Carrier',   protocol: 'SOAP',     status: 'Connected', lastSync: '15 min ago', icon: '📦', color: '#ff6b2b' },
  { id: 'INT-008', name: 'Customs ICEGate',    type: 'Government',protocol: 'REST',     status: 'Connected', lastSync: '1h ago',     icon: '🏛️', color: '#059669' },
  { id: 'INT-009', name: 'AWS S3 / SQS',       type: 'Cloud',     protocol: 'SDK',      status: 'Connected', lastSync: 'Live',       icon: '☁️', color: '#ff6b2b' },
  { id: 'INT-010', name: 'Google Maps API',    type: 'Maps',      protocol: 'REST',     status: 'Connected', lastSync: 'Live',       icon: '🗺️', color: '#4285F4' },
  { id: 'INT-011', name: 'WhatsApp Business', type: 'Messaging', protocol: 'REST',     status: 'Pending',   lastSync: '—',          icon: '💬', color: '#25D366' },
  { id: 'INT-012', name: 'Oracle TMS',        type: 'TMS',       protocol: 'REST',     status: 'Pending',   lastSync: '—',          icon: '🔶', color: '#F80000' },
];

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  Connected: { color: '#00e676', bg: 'rgba(0,230,118,0.1)',  icon: CheckCircle },
  Error:     { color: '#ff1744', bg: 'rgba(255,23,68,0.1)',  icon: XCircle },
  Pending:   { color: '#ffab00', bg: 'rgba(255,171,0,0.1)', icon: RefreshCw },
};

const EVENT_LOG = [
  { time: '14:32:10', integration: 'project44',    event: 'POSITION_UPDATE',  status: 'success', payload: '{"lat":19.07,"lng":72.87}' },
  { time: '14:31:55', integration: 'SAP S/4HANA',  event: 'STOCK_SYNC',       status: 'success', payload: '{"sku":"SKU-00123","qty":4200}' },
  { time: '14:30:22', integration: 'Delhivery',    event: 'WEBHOOK_RECEIVE',  status: 'error',   payload: '{"error":"Timeout 30s"}' },
  { time: '14:29:11', integration: 'Stripe',       event: 'PAYMENT_CAPTURED', status: 'success', payload: '{"invoice":"INV-2025-0481"}' },
  { time: '14:28:40', integration: 'BlueDart',     event: 'SHIPMENT_CREATE',  status: 'success', payload: '{"awb":"32891044201"}' },
];

export default function IntegrationsModule() {
  const [tab, setTab] = useState<'connectors'|'events'|'webhooks'>('connectors');
  const [filter, setFilter] = useState('All');

  const types = ['All', ...Array.from(new Set(INTEGRATIONS.map(i => i.type)))];
  const displayed = filter === 'All' ? INTEGRATIONS : INTEGRATIONS.filter(i => i.type === filter);

  const connected = INTEGRATIONS.filter(i => i.status === 'Connected').length;
  const errored   = INTEGRATIONS.filter(i => i.status === 'Error').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Integrations <span style={{ color: '#059669' }}>Connector Hub</span></h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>SAP · Carriers · EDI · Stripe · Maps · Cloud · Government APIs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Connectors', value: INTEGRATIONS.length.toString(), color: '#00e5ff' },
          { label: 'Connected',        value: connected.toString(),            color: '#00e676' },
          { label: 'Errors',           value: errored.toString(),              color: '#ff1744' },
          { label: 'Events Today',     value: '48,291',                        color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(color)},0.2)` }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{label.toUpperCase()}</div>
            <div className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {(['connectors','events','webhooks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide capitalize transition-all"
            style={{ background: tab === t ? '#059669' : 'transparent', color: tab === t ? '#fff' : 'var(--color-text-muted)' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'connectors' && (
        <>
          {/* Type filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{ background: filter === t ? 'var(--color-accent-dim)' : 'var(--color-surface)', border: `1px solid ${filter === t ? 'var(--color-accent)' : 'var(--color-border)'}`, color: filter === t ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {displayed.map((int) => {
              const { color: sc, bg, icon: SIcon } = statusConfig[int.status];
              return (
                <div key={int.id} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: `1px solid rgba(${hexToRgb(int.color)},0.2)` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{int.icon}</span>
                      <div>
                        <div className="text-xs font-bold">{int.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{int.type} · {int.protocol}</div>
                      </div>
                    </div>
                    <div className="p-1 rounded" style={{ background: bg }}><SIcon size={12} style={{ color: sc }} /></div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: sc, fontWeight: 600 }}>{int.status}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Sync: {int.lastSync}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'events' && (
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>LIVE EVENT LOG</div>
          {EVENT_LOG.map((e, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl"
              style={{ background: 'var(--color-surface)', border: `1px solid ${e.status === 'error' ? 'rgba(255,23,68,0.2)' : 'var(--color-border)'}` }}>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', minWidth: 60 }}>{e.time}</span>
              <span className="text-xs font-semibold" style={{ color: '#059669', minWidth: 120 }}>{e.integration}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', minWidth: 140 }}>{e.event}</span>
              <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{e.payload}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full`}
                style={{ background: e.status === 'success' ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)', color: e.status === 'success' ? '#00e676' : '#ff1744' }}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Zap size={32} className="mx-auto mb-3" style={{ color: '#059669' }} />
          <h2 className="font-bold text-lg mb-2">Webhook Manager</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Configure inbound and outbound webhooks with retry, signature verification, and replay</p>
          <button className="mt-4 px-5 py-2 rounded-xl text-sm font-bold" style={{ background: '#059669', color: '#fff' }}>Add Webhook</button>
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
