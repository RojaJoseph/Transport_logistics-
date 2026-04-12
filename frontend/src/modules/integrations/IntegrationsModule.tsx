import { useState } from 'react';
import { Plug, CheckCircle, XCircle, RefreshCw, Plus, Zap, Clock } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const INTEGRATIONS = [
  { id:'INT-001', name:'SAP S/4HANA',        type:'ERP',       protocol:'RFC/BAPI',    status:'Connected', sync:'2 min ago',  icon:'🏢', color:'#00d4ff' },
  { id:'INT-002', name:'BlueDart API',        type:'Carrier',   protocol:'REST',        status:'Connected', sync:'5 min ago',  icon:'✈️', color:'#2563eb' },
  { id:'INT-003', name:'DTDC EDI',            type:'EDI',       protocol:'X12/EDIFACT', status:'Connected', sync:'1h ago',     icon:'📋', color:'#7c3aed' },
  { id:'INT-004', name:'Stripe Billing',      type:'Finance',   protocol:'REST',        status:'Connected', sync:'10 min ago', icon:'💳', color:'#f59e0b' },
  { id:'INT-005', name:'Delhivery',           type:'Carrier',   protocol:'REST',        status:'Error',     sync:'2h ago',     icon:'🚚', color:'#ef4444' },
  { id:'INT-006', name:'FedEx Web Services',  type:'Carrier',   protocol:'SOAP',        status:'Connected', sync:'15 min ago', icon:'📦', color:'#f97316' },
  { id:'INT-007', name:'Customs ICEGate',     type:'Government',protocol:'REST',        status:'Connected', sync:'1h ago',     icon:'🏛️', color:'#10b981' },
  { id:'INT-008', name:'Google Maps API',     type:'Maps',      protocol:'REST',        status:'Connected', sync:'Live',       icon:'🗺️', color:'#4285F4' },
  { id:'INT-009', name:'AWS S3 / SQS',        type:'Cloud',     protocol:'SDK',         status:'Connected', sync:'Live',       icon:'☁️', color:'#f97316' },
  { id:'INT-010', name:'WhatsApp Business',   type:'Messaging', protocol:'REST',        status:'Pending',   sync:'—',          icon:'💬', color:'#25D366' },
  { id:'INT-011', name:'Oracle TMS',          type:'TMS',       protocol:'REST',        status:'Pending',   sync:'—',          icon:'🔶', color:'#F80000' },
  { id:'INT-012', name:'Gati API',            type:'Carrier',   protocol:'REST',        status:'Connected', sync:'30 min ago', icon:'🛵', color:'#00d4ff' },
];

const EVENT_LOG = [
  { time:'14:32:10', name:'SAP S/4HANA',   event:'STOCK_SYNC',       status:'success', payload:'{"sku":"SKU-00123","qty":4200}' },
  { time:'14:31:55', name:'BlueDart API',  event:'SHIPMENT_CREATE',  status:'success', payload:'{"awb":"328910442"}' },
  { time:'14:30:22', name:'Delhivery',     event:'WEBHOOK_RECEIVE',  status:'error',   payload:'{"error":"Timeout 30s"}' },
  { time:'14:29:11', name:'Stripe',        event:'PAYMENT_CAPTURED', status:'success', payload:'{"invoice":"INV-2025-0481"}' },
  { time:'14:28:40', name:'BlueDart API',  event:'TRACK_SHIPMENT',   status:'success', payload:'{"awb":"328910442","status":"in_transit"}' },
];

const stCfg: Record<string,{color:string;bg:string;icon:any}> = {
  Connected: { color:'#10b981', bg:'rgba(16,185,129,0.1)', icon:CheckCircle },
  Error:     { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  icon:XCircle     },
  Pending:   { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', icon:RefreshCw   },
};

export default function IntegrationsModule() {
  const [tab, setTab]   = useState<'connectors'|'events'|'webhooks'>('connectors');
  const [filter, setFilter] = useState('All');
  const types = ['All', ...Array.from(new Set(INTEGRATIONS.map(i=>i.type)))];
  const shown  = filter==='All' ? INTEGRATIONS : INTEGRATIONS.filter(i=>i.type===filter);

  const connected = INTEGRATIONS.filter(i=>i.status==='Connected').length;
  const errors    = INTEGRATIONS.filter(i=>i.status==='Error').length;
  const pending   = INTEGRATIONS.filter(i=>i.status==='Pending').length;

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="integrations"
        icon="🔌"
        title="Integrations Hub"
        subtitle="CONNECTOR ECOSYSTEM"
        color="#059669"
        description="Connect TransportOS to your entire logistics tech stack. SAP, carrier APIs, EDI partners, payment gateways, maps, cloud storage — all from one unified connector hub."
        features={['SAP RFC/BAPI connector','Carrier REST/SOAP APIs','EDI X12 & EDIFACT','Stripe payment gateway','Google Maps & routing','AWS S3/SQS cloud storage','Webhook registry with HMAC','Real-time event log']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Integrations <span style={{ color:'#059669' }}>Connector Hub</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          SAP · Carriers · EDI · Stripe · Maps · Cloud · Government APIs
        </p>

        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'TOTAL',     value:String(INTEGRATIONS.length), color:'#00d4ff' },
            { label:'CONNECTED', value:String(connected),            color:'#10b981' },
            { label:'ERRORS',    value:String(errors),               color:'#ef4444' },
            { label:'PENDING',   value:String(pending),              color:'#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ padding:'14px 16px', borderRadius:12, background:`${k.color}08`, border:`1px solid ${k.color}20` }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:6 }}>{k.label} CONNECTORS</div>
              <div style={{ fontSize:24, fontWeight:800, color:k.color, fontFamily:'var(--font-mono)' }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20 }}>
          {(['connectors','events','webhooks'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 18px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background:tab===t?'#059669':'rgba(255,255,255,0.04)',
              border:`1px solid ${tab===t?'#05996950':'rgba(255,255,255,0.06)'}`,
              color:tab===t?'#fff':'var(--text-muted)',
              transition:'all 0.15s', textTransform:'capitalize',
            }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
          <ActionModal title="Add Connector" color="#059669" trigger={
            <button className="btn btn-sm" style={{ marginLeft:'auto', background:'linear-gradient(135deg,#059669,#047857)', border:'none', color:'#fff', padding:'7px 16px', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:12, gap:6, display:'flex', alignItems:'center' }}>
              <Plus size={13}/> Add Connector
            </button>
          }>
            <FormInput label="Integration Name" placeholder="e.g. FedEx Ground API" value="" onChange={()=>{}} />
            <FormSelect label="Type" options={['Carrier','ERP','EDI','Finance','Maps','Cloud','Government','TMS','Messaging']} value="Carrier" onChange={()=>{}} />
            <FormSelect label="Protocol" options={['REST','SOAP','RFC/BAPI','SDK','X12/EDIFACT','GraphQL','gRPC']} value="REST" onChange={()=>{}} />
            <FormInput label="API Base URL" placeholder="https://api.provider.com" value="" onChange={()=>{}} />
            <FormInput label="API Key" placeholder="Your API key" value="" onChange={()=>{}} />
            <SubmitBtn label="Add Connector" color="#059669" onClick={()=>{}} />
          </ActionModal>
        </div>

        {/* Connectors grid */}
        {tab === 'connectors' && (
          <>
            {/* Type filter */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
              {types.map(t => (
                <button key={t} onClick={()=>setFilter(t)} style={{
                  padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
                  background:filter===t?'rgba(5,150,105,0.15)':'transparent',
                  border:`1px solid ${filter===t?'rgba(5,150,105,0.4)':'rgba(255,255,255,0.08)'}`,
                  color:filter===t?'#10b981':'var(--text-muted)',
                  transition:'all 0.15s',
                }}>{t}</button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {shown.map(int => {
                const cfg = stCfg[int.status];
                const Icon = cfg.icon;
                return (
                  <ActionModal key={int.id} title={int.name} color={int.color} trigger={
                    <div style={{
                      padding:'16px', borderRadius:12, cursor:'pointer',
                      background:'rgba(12,18,32,0.85)',
                      border:`1px solid ${int.color}18`,
                      transition:'all 0.18s',
                    }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${int.color}40`;(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${int.color}18`;(e.currentTarget as HTMLElement).style.transform='translateY(0)';}}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                        <span style={{ fontSize:24 }}>{int.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{int.name}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{int.type} · {int.protocol}</div>
                        </div>
                        <div style={{ padding:'4px', borderRadius:6, background:cfg.bg }}>
                          <Icon size={12} color={cfg.color} />
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:11, fontWeight:600, color:cfg.color }}>{int.status}</span>
                        <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>Sync: {int.sync}</span>
                      </div>
                    </div>
                  }>
                    <div style={{ display:'grid', gap:8, marginBottom:16 }}>
                      {[['Status',int.status,cfg.color],['Type',int.type,'var(--text-primary)'],['Protocol',int.protocol,'#00d4ff'],['Last Sync',int.sync,'var(--text-muted)']].map(([k,v,c])=>(
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>{k}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:String(c) }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <SubmitBtn label="Test Connection" color={int.color} onClick={()=>{}} />
                      <button style={{ padding:'11px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        View Logs
                      </button>
                    </div>
                  </ActionModal>
                );
              })}
            </div>
          </>
        )}

        {/* Events log */}
        {tab === 'events' && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>LIVE EVENT LOG</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {EVENT_LOG.map((e, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'70px 140px 180px 1fr 80px',
                  alignItems:'center', gap:12,
                  padding:'12px 14px', borderRadius:10,
                  background:'rgba(12,18,32,0.85)',
                  border:`1px solid ${e.status==='error'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.05)'}`,
                }}>
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{e.time}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#059669', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</span>
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{e.event}</span>
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(0,212,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.payload}</span>
                  <span style={{ padding:'3px 8px', borderRadius:99, fontSize:10, fontWeight:700, textAlign:'center', background:e.status==='success'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:e.status==='success'?'#10b981':'#ef4444' }}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Webhooks */}
        {tab === 'webhooks' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <Zap size={40} color="#059669" style={{ marginBottom:16 }} />
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Webhook Manager</h2>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:20 }}>
              Register inbound/outbound webhooks with HMAC-SHA256 signature verification, retry logic and event replay.
            </p>
            <ActionModal title="Register Webhook" color="#059669" trigger={
              <button style={{ padding:'12px 24px', borderRadius:10, background:'linear-gradient(135deg,#059669,#047857)', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                + Add Webhook
              </button>
            }>
              <FormInput label="Endpoint URL" placeholder="https://your-server.com/webhook" value="" onChange={()=>{}} />
              <FormSelect label="Events to Subscribe" options={['order.created','order.delivered','shipment.delayed','invoice.paid','geofence.alert','*  (all events)']} value="order.created" onChange={()=>{}} />
              <FormInput label="Secret (auto-generated if blank)" placeholder="Leave blank for auto" value="" onChange={()=>{}} />
              <SubmitBtn label="Register Webhook" color="#059669" onClick={()=>{}} />
            </ActionModal>
          </div>
        )}
      </div>
    </div>
  );
}
