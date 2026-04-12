import { useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, CheckCheck, Trash2, Plus, Zap } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';
import { useNotificationStore } from '@/store/notificationStore';

const CHANNELS = [
  { icon:'📧', label:'Email',     sub:'SendGrid SMTP',  color:'#00d4ff', active:true  },
  { icon:'💬', label:'SMS',       sub:'Twilio',          color:'#7c3aed', active:true  },
  { icon:'📱', label:'Push (FCM)',sub:'Firebase',        color:'#f97316', active:true  },
  { icon:'🔔', label:'In-App',   sub:'WebSocket',       color:'#10b981', active:true  },
];

const TEMPLATES = [
  { id:'TPL-001', name:'Shipment Dispatched',   trigger:'On dispatch',      channels:['Email','SMS','Push'],         active:true  },
  { id:'TPL-002', name:'Delivery Completed',    trigger:'On delivery',      channels:['Email','Push'],               active:true  },
  { id:'TPL-003', name:'Delay Alert',           trigger:'SLA breach risk',  channels:['Email','SMS','Push','In-App'],active:true  },
  { id:'TPL-004', name:'Invoice Generated',     trigger:'Finance event',    channels:['Email'],                      active:true  },
  { id:'TPL-005', name:'Route Changed',         trigger:'Route update',     channels:['SMS','Push'],                 active:false },
  { id:'TPL-006', name:'Exception Detected',    trigger:'AI anomaly',       channels:['Email','SMS','Push','In-App'],active:true  },
];

const chColor: Record<string,string> = { Email:'#00d4ff', SMS:'#7c3aed', Push:'#f97316', 'In-App':'#10b981' };

export default function NotificationsModule() {
  const { notifications, markAllRead, clearAll, unreadCount, addNotification } = useNotificationStore();
  const [tab, setTab] = useState<'feed'|'channels'|'templates'|'test'>('feed');

  const fireTest = (type:'success'|'warning'|'error'|'info') => {
    addNotification({ type, title:`Test ${type} notification`, message:`This is a test ${type} notification from TransportOS.`, module:'notifications' });
  };

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="notifications"
        icon="🔔"
        title="Notifications Hub"
        subtitle="MULTI-CHANNEL ALERTS"
        color="#9333ea"
        description="Send and receive real-time alerts across Email, SMS, Push and In-App channels. Configure event-driven templates that auto-fire when logistics events occur."
        features={['Email via SendGrid','SMS via Twilio','Push via Firebase FCM','In-App WebSocket feed','Event-driven templates','{{variable}} interpolation','Delivery status tracking','Test notification firing']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Notifications <span style={{ color:'#9333ea' }}>Multi-Channel Hub</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Email · SMS · Push · In-App · Webhooks · Event rules
        </p>

        {/* Channel status cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {CHANNELS.map(ch => (
            <div key={ch.label} style={{
              padding:'14px', borderRadius:12,
              background:`${ch.color}08`,
              border:`1px solid ${ch.color}25`,
              display:'flex', alignItems:'center', gap:12,
            }}>
              <div style={{ fontSize:22 }}>{ch.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{ch.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{ch.sub}</div>
              </div>
              <div style={{ width:8, height:8, borderRadius:'50%', background:ch.active?'#10b981':'#ef4444', boxShadow:`0 0 6px ${ch.active?'#10b981':'#ef4444'}`, flexShrink:0 }} />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20 }}>
          {(['feed','channels','templates','test'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 18px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background:tab===t?'#9333ea':'rgba(255,255,255,0.04)',
              border:`1px solid ${tab===t?'#9333ea50':'rgba(255,255,255,0.06)'}`,
              color:tab===t?'#fff':'var(--text-muted)',
              transition:'all 0.15s', textTransform:'capitalize',
            }}>
              {t === 'feed' ? `Feed ${unreadCount>0?`(${unreadCount})`:''}` : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* FEED */}
        {tab === 'feed' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                NOTIFICATION FEED
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={markAllRead} style={{ padding:'5px 12px', borderRadius:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text-muted)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <CheckCheck size={12}/> Mark all read
                </button>
                <button onClick={clearAll} style={{ padding:'5px 12px', borderRadius:6, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <Trash2 size={12}/> Clear all
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding:'60px 20px', textAlign:'center' }}>
                <Bell size={40} color="var(--text-muted)" style={{ marginBottom:16 }} />
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>No notifications yet</p>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>Events from all modules will appear here</p>
                <button onClick={()=>setTab('test')} style={{ padding:'8px 20px', borderRadius:8, background:'linear-gradient(135deg,#9333ea,#7c3aed)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Fire a test notification →
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {notifications.map(n => {
                  const cfg = { success:{ color:'#10b981', bg:'rgba(16,185,129,0.08)' }, warning:{ color:'#f59e0b', bg:'rgba(245,158,11,0.08)' }, error:{ color:'#ef4444', bg:'rgba(239,68,68,0.08)' }, info:{ color:'#00d4ff', bg:'rgba(0,212,255,0.08)' } }[n.type];
                  return (
                    <div key={n.id} style={{
                      display:'flex', gap:12, padding:'14px 16px', borderRadius:12,
                      background:n.read?'rgba(12,18,32,0.6)':'rgba(12,18,32,0.9)',
                      border:`1px solid ${n.read?'rgba(255,255,255,0.04)':cfg.color+'30'}`,
                      opacity:n.read?0.7:1,
                    }}>
                      {!n.read && <div style={{ width:6, height:6, borderRadius:'50%', background:'#9333ea', marginTop:6, flexShrink:0 }} />}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:3 }}>{n.title}</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{n.message}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:5 }}>
                          {n.module} · {n.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      <span style={{ padding:'3px 8px', borderRadius:99, fontSize:9, fontWeight:700, background:cfg.bg, color:cfg.color, height:'fit-content' }}>{n.type}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES */}
        {tab === 'templates' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>NOTIFICATION TEMPLATES</span>
              <ActionModal title="Create Template" color="#9333ea" trigger={
                <button className="btn btn-sm" style={{ background:'linear-gradient(135deg,#9333ea,#7c3aed)', border:'none', color:'#fff', padding:'6px 14px', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:12, gap:6, display:'flex', alignItems:'center' }}>
                  <Plus size={12}/> New Template
                </button>
              }>
                <FormInput label="Template Name" placeholder="e.g. Payment Reminder" value="" onChange={()=>{}} />
                <FormInput label="Trigger Event" placeholder="e.g. invoice.overdue" value="" onChange={()=>{}} />
                <FormSelect label="Primary Channel" options={['Email','SMS','Push','In-App']} value="Email" onChange={()=>{}} />
                <FormInput label="Subject Template" placeholder="e.g. Invoice {{invoice_number}} is overdue" value="" onChange={()=>{}} />
                <FormInput label="Body Template" placeholder="e.g. Dear {{customer}}, your invoice..." value="" onChange={()=>{}} />
                <SubmitBtn label="Create Template" color="#9333ea" onClick={()=>{}} />
              </ActionModal>
            </div>
            <div style={{ display:'grid', gap:10 }}>
              {TEMPLATES.map(t => (
                <div key={t.id} style={{ padding:'14px 16px', borderRadius:12, background:'rgba(12,18,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:t.active?'#10b981':'var(--text-muted)', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>{t.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Trigger: {t.trigger}</div>
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:200 }}>
                    {t.channels.map(c => (
                      <span key={c} style={{ padding:'2px 7px', borderRadius:99, fontSize:9, fontWeight:700, background:`${chColor[c]}15`, color:chColor[c] }}>{c}</span>
                    ))}
                  </div>
                  <button style={{ padding:'5px 12px', borderRadius:6, background:'rgba(147,51,234,0.1)', border:'1px solid rgba(147,51,234,0.25)', color:'#9333ea', fontSize:11, fontWeight:600, cursor:'pointer' }}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEST */}
        {tab === 'test' && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:14 }}>
              FIRE TEST NOTIFICATIONS — Appear instantly in the Feed tab
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {([['success','✅','#10b981'],['warning','⚠️','#f59e0b'],['error','🚨','#ef4444'],['info','ℹ️','#00d4ff']] as [any,string,string][]).map(([type,icon,color])=>(
                <button key={type} onClick={()=>fireTest(type)} style={{
                  padding:'20px', borderRadius:14, cursor:'pointer',
                  background:`${color}08`, border:`1px solid ${color}25`,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                  transition:'all 0.18s',
                }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${color}15`;(e.currentTarget as HTMLElement).style.transform='scale(1.02)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${color}08`;(e.currentTarget as HTMLElement).style.transform='scale(1)';}}>
                  <span style={{ fontSize:32 }}>{icon}</span>
                  <div style={{ fontSize:14, fontWeight:700, color, textTransform:'capitalize' }}>Fire {type}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>Click to send test notification</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop:20, padding:'16px', borderRadius:12, background:'rgba(147,51,234,0.06)', border:'1px solid rgba(147,51,234,0.15)' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#9333ea', fontFamily:'var(--font-mono)', marginBottom:10 }}>SEND CUSTOM NOTIFICATION</div>
              <ActionModal title="Send Custom Notification" color="#9333ea" trigger={
                <button style={{ width:'100%', padding:'10px', background:'linear-gradient(135deg,#9333ea,#7c3aed)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  <Zap size={13} style={{ display:'inline', marginRight:6 }} /> Send Custom Alert
                </button>
              }>
                <FormSelect label="Type" options={['info','success','warning','error']} value="info" onChange={()=>{}} />
                <FormInput label="Title" placeholder="e.g. New shipment created" value="" onChange={()=>{}} />
                <FormInput label="Message" placeholder="e.g. SHP-2855 has been dispatched" value="" onChange={()=>{}} />
                <FormInput label="Recipient Email (optional)" placeholder="ops@company.com" value="" onChange={()=>{}} />
                <SubmitBtn label="Send Notification" color="#9333ea" onClick={()=>fireTest('info')} />
              </ActionModal>
            </div>
          </div>
        )}

        {/* CHANNELS config */}
        {tab === 'channels' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {CHANNELS.map(ch => (
              <div key={ch.label} style={{ padding:'20px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:`1px solid ${ch.color}20` }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <span style={{ fontSize:28 }}>{ch.icon}</span>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>{ch.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{ch.sub}</div>
                  </div>
                  <div style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:99, background:ch.active?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:ch.active?'#10b981':'#ef4444', fontSize:10, fontWeight:700 }}>
                    {ch.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <ActionModal title={`Configure ${ch.label}`} color={ch.color} trigger={
                  <button style={{ width:'100%', padding:'8px', background:`${ch.color}15`, border:`1px solid ${ch.color}30`, borderRadius:8, color:ch.color, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Configure →
                  </button>
                }>
                  {ch.label === 'Email' && <>
                    <FormInput label="SendGrid API Key" placeholder="SG...." value="" onChange={()=>{}} />
                    <FormInput label="From Email" placeholder="noreply@company.com" value="" onChange={()=>{}} />
                    <SubmitBtn label="Save Email Config" color={ch.color} onClick={()=>{}} />
                  </>}
                  {ch.label === 'SMS' && <>
                    <FormInput label="Twilio Account SID" placeholder="ACxxx..." value="" onChange={()=>{}} />
                    <FormInput label="Twilio Auth Token" placeholder="..." value="" onChange={()=>{}} />
                    <FormInput label="From Phone Number" placeholder="+1234567890" value="" onChange={()=>{}} />
                    <SubmitBtn label="Save SMS Config" color={ch.color} onClick={()=>{}} />
                  </>}
                  {(ch.label === 'Push (FCM)' || ch.label === 'In-App') && <>
                    <FormInput label="Firebase Server Key" placeholder="AAAA..." value="" onChange={()=>{}} />
                    <SubmitBtn label={`Save ${ch.label} Config`} color={ch.color} onClick={()=>{}} />
                  </>}
                </ActionModal>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
