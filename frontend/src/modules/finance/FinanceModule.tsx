import { useState } from 'react';
import { DollarSign, FileText, Download, Plus, TrendingUp, TrendingDown, CreditCard, BarChart3 } from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import { ActionModal, FormInput, FormSelect, SubmitBtn } from '@/components/ActionModal';

const INVOICES = [
  { id:'INV-2025-0481', customer:'Tata Motors Ltd',       amount:569350,  status:'Paid',    due:'2025-05-15', date:'2025-04-01' },
  { id:'INV-2025-0480', customer:'Reliance Industries',   amount:1463200, status:'Pending', due:'2025-05-10', date:'2025-03-28' },
  { id:'INV-2025-0479', customer:'Infosys Logistics',     amount:258125,  status:'Overdue', due:'2025-04-30', date:'2025-03-20' },
  { id:'INV-2025-0478', customer:'Mahindra & Mahindra',   amount:1056100, status:'Pending', due:'2025-05-20', date:'2025-04-02' },
  { id:'INV-2025-0477', customer:'Asian Paints Ltd',      amount:191514,  status:'Paid',    due:'2025-04-25', date:'2025-03-25' },
  { id:'INV-2025-0476', customer:'HCL Technologies',      amount:406864,  status:'Overdue', due:'2025-04-28', date:'2025-03-18' },
  { id:'INV-2025-0475', customer:'L&T Logistics',         amount:1156400, status:'Pending', due:'2025-05-25', date:'2025-04-05' },
];

const invCfg: Record<string,{color:string;bg:string}> = {
  Paid:    { color:'#10b981', bg:'rgba(16,185,129,0.1)' },
  Pending: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
  Overdue: { color:'#ef4444', bg:'rgba(239,68,68,0.1)'  },
};

const fmt = (n: number) => `₹${(n/1000).toFixed(1)}K`;

export default function FinanceModule() {
  const [tab, setTab] = useState<'invoices'|'analytics'|'reports'>('invoices');

  const paid    = INVOICES.filter(i=>i.status==='Paid').reduce((s,i)=>s+i.amount,0);
  const pending = INVOICES.filter(i=>i.status==='Pending').reduce((s,i)=>s+i.amount,0);
  const overdue = INVOICES.filter(i=>i.status==='Overdue').reduce((s,i)=>s+i.amount,0);

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <PageIntro
        storageKey="finance"
        icon="💰"
        title="Finance & Billing"
        subtitle="REVENUE INTELLIGENCE"
        color="#ca8a04"
        description="Complete financial management — create invoices, track payments, monitor cash flow, and generate P&L reports. Integrated with Stripe for live payment processing."
        features={['Invoice creation with GST','Stripe payment processing','Revenue vs Cost analysis','Outstanding & overdue tracking','P&L reporting','Cash flow monitoring','Customer billing history','Tax computation (18% GST)']}
      />

      <div style={{ padding:'20px 20px 16px' }}>
        <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:'0 0 4px' }}>
          Finance & Billing <span style={{ color:'#ca8a04' }}>Revenue Intelligence</span>
        </h1>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'0 0 16px', fontFamily:'var(--font-mono)' }}>
          Invoicing · Payments · Cost accounting · P&L · Stripe
        </p>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'REVENUE (MTD)', value:'₹4.2Cr', sub:'Target: ₹5.0Cr',    color:'#10b981', icon:'📈', trend:'+8.2%' },
            { label:'OUTSTANDING',   value:fmt(pending), sub:`${INVOICES.filter(i=>i.status==='Pending').length} invoices`,color:'#f59e0b',icon:'⏳',trend:null },
            { label:'OVERDUE',       value:fmt(overdue), sub:'Past due date',   color:'#ef4444', icon:'⚠️', trend:null },
            { label:'GROSS MARGIN',  value:'34.2%',  sub:'+2.1% vs last month', color:'#00d4ff', icon:'📊', trend:'+2.1%' },
          ].map(k => (
            <div key={k.label} style={{
              padding:'16px', borderRadius:14,
              background:'rgba(12,18,32,0.85)',
              border:`1px solid ${k.color}20`,
              position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:`linear-gradient(90deg,transparent,${k.color},transparent)` }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <span style={{ fontSize:20 }}>{k.icon}</span>
                {k.trend && <span style={{ fontSize:11, fontWeight:600, color:'#10b981' }}>{k.trend}</span>}
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'var(--font-mono)', marginBottom:4 }}>{k.value}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{k.label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20 }}>
          {(['invoices','analytics','reports'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 18px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
              background:tab===t?'#ca8a04':'rgba(255,255,255,0.04)',
              border:`1px solid ${tab===t?'#ca8a0450':'rgba(255,255,255,0.06)'}`,
              color:tab===t?'#000':'var(--text-muted)',
              transition:'all 0.15s',
              textTransform:'capitalize',
            }}>{t}</button>
          ))}
          <ActionModal title="Create Invoice" color="#ca8a04" trigger={
            <button className="btn btn-sm" style={{ marginLeft:'auto', background:'linear-gradient(135deg,#ca8a04,#b45309)', color:'#000', gap:6, border:'none', padding:'7px 16px', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:12 }}>
              <Plus size={13}/> New Invoice
            </button>
          }>
            <FormInput label="Customer Name" placeholder="e.g. Tata Motors Ltd" value="" onChange={()=>{}} />
            <FormInput label="Amount (₹)" type="number" placeholder="e.g. 500000" value="" onChange={()=>{}} />
            <FormInput label="Due Date" type="date" value="" onChange={()=>{}} />
            <FormSelect label="Tax Rate" options={['0%','5%','12%','18%','28%']} value="18%" onChange={()=>{}} />
            <FormInput label="Notes" placeholder="Optional invoice notes" value="" onChange={()=>{}} />
            <SubmitBtn label="Generate Invoice" color="#ca8a04" onClick={()=>{}} />
          </ActionModal>
        </div>

        {/* Invoice cards */}
        {tab === 'invoices' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
            {INVOICES.map(inv => {
              const cfg = invCfg[inv.status];
              return (
                <ActionModal key={inv.id} title={inv.id} color={cfg.color} trigger={
                  <div style={{
                    padding:'16px', borderRadius:12, cursor:'pointer',
                    background:'rgba(12,18,32,0.85)',
                    border:`1px solid ${cfg.color}20`,
                    transition:'all 0.18s',
                  }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${cfg.color}45`;(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${cfg.color}20`;(e.currentTarget as HTMLElement).style.transform='translateY(0)';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#ca8a04', fontFamily:'var(--font-mono)' }}>{inv.id}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginTop:3 }}>{inv.customer}</div>
                      </div>
                      <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color }}>{inv.status}</span>
                    </div>
                    <div style={{ fontSize:22, fontWeight:800, color:cfg.color, fontFamily:'var(--font-mono)', marginBottom:10 }}>
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
                      <span>Issued: {inv.date}</span>
                      <span style={{ color: inv.status==='Overdue'?'#ef4444':'var(--text-muted)' }}>Due: {inv.due}</span>
                    </div>
                  </div>
                }>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                    {[['Invoice ID',inv.id],['Customer',inv.customer],['Amount',`₹${inv.amount.toLocaleString('en-IN')}`],['Status',inv.status],['Issued',inv.date],['Due Date',inv.due]].map(([k,v])=>(
                      <div key={k} style={{ padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{k}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:k==='Status'?cfg.color:'var(--text-primary)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <SubmitBtn label={inv.status==='Paid'?'✓ Already Paid':'Mark as Paid'} color={cfg.color} onClick={()=>{}} />
                    <button style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'var(--text-secondary)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      Download PDF
                    </button>
                  </div>
                </ActionModal>
              );
            })}
          </div>
        )}

        {tab === 'analytics' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { title:'Collection Rate', value:'78.4%', sub:'Paid vs Total Invoiced', color:'#10b981' },
              { title:'Avg Invoice Value', value:'₹5.87L', sub:'This month', color:'#00d4ff' },
              { title:'Days Sales Outstanding', value:'32 days', sub:'Target: 30 days', color:'#f59e0b' },
              { title:'Month on Month Growth', value:'+8.2%', sub:'Revenue trend', color:'#7c3aed' },
            ].map(m => (
              <div key={m.title} style={{ padding:'20px', borderRadius:14, background:'rgba(12,18,32,0.85)', border:`1px solid ${m.color}20`, textAlign:'center' }}>
                <div style={{ fontSize:32, fontWeight:800, color:m.color, fontFamily:'var(--font-mono)', marginBottom:8 }}>{m.value}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{m.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {['P&L Statement','Balance Sheet','Cash Flow','Cost by Lane','Carrier Spend','Revenue Forecast','GST Report','Accounts Receivable'].map(r => (
              <button key={r} style={{
                padding:'16px', borderRadius:12, cursor:'pointer',
                background:'rgba(12,18,32,0.85)',
                border:'1px solid rgba(255,255,255,0.06)',
                color:'var(--text-primary)', fontSize:13, fontWeight:600,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                transition:'all 0.15s',
              }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(202,138,4,0.4)';(e.currentTarget as HTMLElement).style.color='#ca8a04';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.06)';(e.currentTarget as HTMLElement).style.color='var(--text-primary)';}}>
                {r} <Download size={13}/>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
