import { useState } from 'react';
import { Shield, Users, Key, Lock, CheckCircle, XCircle, AlertTriangle, Plus, Download } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const USERS = [
  { id:'USR-001', name:'Arjun Sharma',  email:'arjun.sharma@company.com',  role:'SUPER_ADMIN',   mfa:true,  status:'Active',   last:'2 min ago',  sessions:3 },
  { id:'USR-002', name:'Priya Nair',    email:'priya.nair@company.com',    role:'OPS_MANAGER',   mfa:true,  status:'Active',   last:'18 min ago', sessions:1 },
  { id:'USR-003', name:'Ravi Kumar',    email:'ravi.kumar@company.com',    role:'LOGISTICS_EXEC',mfa:false, status:'Active',   last:'1h ago',     sessions:2 },
  { id:'USR-004', name:'Deepa Menon',   email:'deepa.menon@company.com',   role:'FINANCE_ADMIN', mfa:true,  status:'Active',   last:'3h ago',     sessions:1 },
  { id:'USR-005', name:'Suresh Pillai', email:'suresh.pillai@company.com', role:'DRIVER',        mfa:false, status:'Inactive', last:'2d ago',     sessions:0 },
  { id:'USR-006', name:'Ananya Singh',  email:'ananya.singh@company.com',  role:'ANALYST',       mfa:true,  status:'Active',   last:'45 min ago', sessions:1 },
];

const roleColor: Record<string,string> = {
  SUPER_ADMIN:'#ef4444', OPS_MANAGER:'#7c3aed', LOGISTICS_EXEC:'#00d4ff',
  FINANCE_ADMIN:'#f59e0b', DRIVER:'#10b981', ANALYST:'#f97316',
};

const AUDIT = [
  { time:'14:32:11', user:'Arjun Sharma',  action:'PERMISSION_GRANT',  detail:'Granted FINANCE_VIEW to Ananya Singh',      risk:'low'    },
  { time:'14:28:04', user:'Priya Nair',    action:'USER_LOGIN',         detail:'Login from 103.21.x.x (Chennai)',            risk:'low'    },
  { time:'13:55:42', user:'Unknown',       action:'FAILED_LOGIN',       detail:'5 failed attempts on ravi.kumar@company.com',risk:'high'   },
  { time:'13:20:19', user:'Deepa Menon',   action:'EXPORT_DATA',        detail:'Finance report Q1 2025 exported',            risk:'medium' },
  { time:'12:10:33', user:'Suresh Pillai', action:'USER_DEACTIVATED',   detail:'Account deactivated by Arjun Sharma',        risk:'medium' },
];
const riskColor: Record<string,string> = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' };

export default function IdentityModule() {
  const [tab, setTab] = useState<'users'|'roles'|'audit'|'mfa'>('users');

  const mfaAdoption = Math.round(USERS.filter(u=>u.mfa).length / USERS.length * 100);

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="identity"
        icon="🔐"
        title="Identity & Security"
        subtitle="ZERO-TRUST ARCHITECTURE"
        color="#dc2626"
        description="Enterprise-grade identity management with OAuth 2.0, role-based access control, multi-factor authentication, and a complete audit trail for compliance."
        features={['OAuth 2.0 + OpenID Connect','RBAC with granular permissions','TOTP-based MFA enforcement','Complete audit trail','Session management','IP-based access control','Password policy enforcement','Inactive user detection']}
      />

      <div style={{ padding:'20px 20px 0', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Identity & Security <span style={{ color:'#dc2626' }}>Zero-Trust</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          OAuth 2.0 · RBAC · MFA · Audit logs · Keycloak
        </p>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'TOTAL USERS',     value:String(USERS.length), sub:`${USERS.filter(u=>u.role==='SUPER_ADMIN').length} admins`,          color:'#00d4ff' },
            { label:'ACTIVE SESSIONS', value:'38',                  sub:'Across 12 unique IPs',                                             color:'#10b981' },
            { label:'MFA ADOPTION',    value:`${mfaAdoption}%`,     sub:`${USERS.filter(u=>u.mfa).length} / ${USERS.length} users`,         color:'#f59e0b' },
            { label:'THREAT ALERTS',   value:'3',                   sub:'In last 24 hours',                                                  color:'#ef4444' },
          ].map(k => (
            <div key={k.label} style={{
              padding:'16px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:`1px solid ${k.color}20`,
            }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:8 }}>{k.label}</div>
              <div style={{ fontSize:26, fontWeight:800, color:k.color, fontFamily:'var(--font-mono)', marginBottom:4 }}>{k.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* MFA progress */}
        <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>MFA Adoption Progress</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#f59e0b', fontFamily:'var(--font-mono)' }}>{mfaAdoption}%</span>
          </div>
          <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${mfaAdoption}%`, background:`linear-gradient(90deg,#f59e0b,#ea580c)`, borderRadius:99, boxShadow:'0 0 10px rgba(245,158,11,0.5)' }} />
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
            {USERS.filter(u=>!u.mfa).length} users without MFA — consider enforcing policy
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20 }}>
          {(['users','roles','audit','mfa'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 18px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background:tab===t?'#dc2626':'rgba(255,255,255,0.04)',
              border:`1px solid ${tab===t?'#dc262650':'rgba(255,255,255,0.06)'}`,
              color:tab===t?'#fff':'var(--text-muted)',
              transition:'all 0.15s', textTransform:'capitalize',
            }}>{t.toUpperCase()}</button>
          ))}
          <ActionModal title="Invite New User" color="#dc2626" trigger={
            <button className="btn btn-sm" style={{ marginLeft:'auto', background:'linear-gradient(135deg,#dc2626,#b91c1c)', border:'none', color:'#fff', padding:'7px 16px', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:12, gap:6, display:'flex', alignItems:'center' }}>
              <Plus size={13}/> Invite User
            </button>
          }>
            <FormInput label="Full Name" placeholder="e.g. Rahul Gupta" value="" onChange={()=>{}} />
            <FormInput label="Email" placeholder="rahul.gupta@company.com" value="" onChange={()=>{}} />
            <FormSelect label="Role" options={['LOGISTICS_EXEC','OPS_MANAGER','FINANCE_ADMIN','ANALYST','DRIVER','SUPER_ADMIN']} value="LOGISTICS_EXEC" onChange={()=>{}} />
            <FormSelect label="Require MFA on First Login" options={['Yes','No']} value="Yes" onChange={()=>{}} />
            <SubmitBtn label="Send Invitation" color="#dc2626" onClick={()=>{}} />
          </ActionModal>
        </div>

        {/* USERS tab */}
        {tab === 'users' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            {USERS.map(u => (
              <ActionModal key={u.id} title={u.name} color={roleColor[u.role]} trigger={
                <div style={{
                  padding:'16px', borderRadius:12, cursor:'pointer',
                  background:'rgba(12,18,32,0.85)',
                  border:`1px solid ${u.status==='Active'?`${roleColor[u.role]}20`:'rgba(239,68,68,0.15)'}`,
                  transition:'all 0.18s',
                }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${roleColor[u.role]}45`;(e.currentTarget as HTMLElement).style.transform='translateY(-1px)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=u.status==='Active'?`${roleColor[u.role]}20`:'rgba(239,68,68,0.15)';(e.currentTarget as HTMLElement).style.transform='translateY(0)';}}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <div style={{
                      width:40, height:40, borderRadius:10,
                      background:`${roleColor[u.role]}18`, border:`1px solid ${roleColor[u.role]}30`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16, fontWeight:700, color:roleColor[u.role],
                    }}>{u.name.charAt(0)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-mono)' }}>{u.email}</div>
                    </div>
                    <div style={{ padding:'3px 8px', borderRadius:99, fontSize:9, fontWeight:700, background:u.status==='Active'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', color:u.status==='Active'?'#10b981':'#ef4444' }}>{u.status}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>ROLE</div>
                      <div style={{ fontSize:10, fontWeight:700, color:roleColor[u.role], overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.role}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>MFA</div>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        {u.mfa ? <CheckCircle size={12} color="#10b981"/> : <XCircle size={12} color="#ef4444"/>}
                        <span style={{ fontSize:10, fontWeight:600, color:u.mfa?'#10b981':'#ef4444' }}>{u.mfa?'On':'Off'}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>LAST SEEN</div>
                      <div style={{ fontSize:10, color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>{u.last}</div>
                    </div>
                  </div>
                </div>
              }>
                <div style={{ display:'grid', gap:8, marginBottom:16 }}>
                  {[['User ID',u.id,u.id.includes('USR')?'#00d4ff':undefined],['Email',u.email],['Role',u.role,roleColor[u.role]],['Status',u.status,u.status==='Active'?'#10b981':'#ef4444'],['MFA',u.mfa?'Enabled':'Disabled',u.mfa?'#10b981':'#ef4444'],['Sessions',`${u.sessions} active`]].map(([k,v,c])=>(
                    <div key={String(k)} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:c?String(c):'var(--text-primary)', fontFamily:String(k)==='User ID'||String(k)==='Email'?'var(--font-mono)':undefined }}>{v as string}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <SubmitBtn label="Change Role" color={roleColor[u.role]} onClick={()=>{}} />
                  <button style={{ padding:'11px', background:u.status==='Active'?'rgba(239,68,68,0.08)':'rgba(16,185,129,0.08)', border:`1px solid ${u.status==='Active'?'rgba(239,68,68,0.25)':'rgba(16,185,129,0.25)'}`, borderRadius:8, color:u.status==='Active'?'#ef4444':'#10b981', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {u.status==='Active'?'Deactivate':'Activate'}
                  </button>
                </div>
              </ActionModal>
            ))}
          </div>
        )}

        {/* AUDIT tab */}
        {tab === 'audit' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>AUDIT TRAIL</span>
              <button style={{ padding:'5px 12px', borderRadius:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text-muted)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Download size={11}/> Export
              </button>
            </div>
            {AUDIT.map((a, i) => (
              <div key={i} style={{
                display:'grid', gridTemplateColumns:'70px 130px 160px 1fr 70px',
                alignItems:'center', gap:12,
                padding:'12px 14px', borderRadius:10,
                background:'rgba(12,18,32,0.85)',
                border:`1px solid ${a.risk==='high'?'rgba(239,68,68,0.2)':a.risk==='medium'?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.05)'}`,
              }}>
                <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{a.time}</span>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.user}</span>
                <span style={{ fontSize:10, fontWeight:700, color:riskColor[a.risk], fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.action}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.detail}</span>
                <span style={{ padding:'3px 8px', borderRadius:99, fontSize:9, fontWeight:700, textAlign:'center', background:`${riskColor[a.risk]}15`, color:riskColor[a.risk] }}>{a.risk}</span>
              </div>
            ))}
          </div>
        )}

        {/* ROLES tab */}
        {tab === 'roles' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {Object.entries(roleColor).map(([role, color]) => {
              const perms = ['Dashboard','Orders','Finance','Reports','Admin'];
              const allowed = { SUPER_ADMIN:5, OPS_MANAGER:4, LOGISTICS_EXEC:3, FINANCE_ADMIN:3, ANALYST:2, DRIVER:1 }[role as keyof typeof roleColor] ?? 2;
              return (
                <div key={role} style={{ padding:'16px', borderRadius:12, background:'rgba(12,18,32,0.85)', border:`1px solid ${color}20` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <Shield size={14} color={color} />
                    <span style={{ fontSize:12, fontWeight:700, color }}>{role.replace(/_/g,' ')}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {perms.map((p, i) => (
                      <div key={p} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:6, background:'rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{p}</span>
                        {i < allowed ? <CheckCircle size={12} color="#10b981"/> : <XCircle size={12} color="rgba(255,255,255,0.15)"/>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MFA tab */}
        {tab === 'mfa' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ padding:'24px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:'1px solid rgba(245,158,11,0.2)', textAlign:'center' }}>
              <Lock size={36} color="#f59e0b" style={{ marginBottom:16 }} />
              <div style={{ fontSize:32, fontWeight:800, color:'#f59e0b', fontFamily:'var(--font-mono)', marginBottom:8 }}>{mfaAdoption}%</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>MFA Adoption Rate</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>
                {USERS.filter(u=>u.mfa).length} of {USERS.length} users have MFA enabled
              </div>
              <ActionModal title="Enforce MFA Policy" color="#f59e0b" trigger={
                <button style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', borderRadius:8, color:'#000', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Enforce MFA for All Users
                </button>
              }>
                <div style={{ padding:'14px', borderRadius:8, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', marginBottom:14, fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>
                  This will send MFA setup emails to {USERS.filter(u=>!u.mfa).length} users without MFA enabled. They will be required to set up TOTP before their next login.
                </div>
                <FormSelect label="Grace Period" options={['Immediate','24 hours','3 days','1 week']} value="24 hours" onChange={()=>{}} />
                <SubmitBtn label="Send MFA Setup Emails" color="#f59e0b" onClick={()=>{}} />
              </ActionModal>
            </div>
            <div style={{ padding:'24px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:'1px solid rgba(220,38,38,0.2)' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>Security Recommendations</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { ok:mfaAdoption===100, text:`MFA enforced for all users (${mfaAdoption}%)` },
                  { ok:true,              text:'JWT tokens expire in 8h' },
                  { ok:true,              text:'Audit logging enabled' },
                  { ok:false,             text:'Password rotation policy (recommended 90d)' },
                  { ok:true,              text:'IP allowlist configured' },
                  { ok:false,             text:'SAML SSO integration pending' },
                ].map((rec, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>
                    {rec.ok ? <CheckCircle size={14} color="#10b981"/> : <AlertTriangle size={14} color="#f59e0b"/>}
                    <span style={{ fontSize:12, color:rec.ok?'var(--text-secondary)':'var(--text-primary)' }}>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
