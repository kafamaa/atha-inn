'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStaff } from '@/lib/staffContext';
import { money, num, today } from '@/lib/util';
import { monthLabel, monthReport } from '@/lib/report';

function Report() {
  const m = useSearchParams().get('m') || today().slice(0, 7);
  const all = useStaff();
  const R = monthReport(m, all);
  const cur = R.cur;
  const td = { padding: '5px 8px', borderBottom: '1px solid #dde3e6', textAlign: 'right' };
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 12 }}><button className="btn pri" onClick={() => window.print()}>Print / Save as PDF</button></div>
      <div className="paper" style={{ maxWidth: 820, margin: 'auto', fontSize: 14 }}>
        <div className="row between" style={{ borderBottom: '2px solid #0b4f5c', paddingBottom: 10, marginBottom: 14 }}>
          <div className="row"><img src={all.settings.logo_url || '/logo.png'} alt="" width="54" height="54" style={{ borderRadius: '50%' }} /><div><b style={{ fontSize: 20 }}>{all.settings.name}</b><br />{all.settings.address}</div></div>
          <div style={{ textAlign: 'right' }}><b style={{ fontSize: 18 }}>Financial report</b><br />{monthLabel(m)}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            <tr><td style={{ ...td, textAlign: 'left' }}>Guest payments</td><td style={td}>{money(R.guest, cur)}</td></tr>
            <tr><td style={{ ...td, textAlign: 'left' }}>Other income</td><td style={td}>{money(R.other, cur)}</td></tr>
            <tr><td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>Total income</td><td style={{ ...td, fontWeight: 700 }}>{money(R.inc, cur)}</td></tr>
            {R.catsOut.map(([c, v]) => <tr key={c}><td style={{ ...td, textAlign: 'left' }}>Expense · {c}</td><td style={td}>{money(v, cur)}</td></tr>)}
            <tr><td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>Total expenses</td><td style={{ ...td, fontWeight: 700 }}>{money(R.exp, cur)}</td></tr>
            <tr style={{ background: '#e8edf3' }}><td style={{ ...td, textAlign: 'left', fontWeight: 800 }}>Balance</td><td style={{ ...td, fontWeight: 800 }}>{money(R.bal, cur)}</td></tr>
            <tr><td style={{ ...td, textAlign: 'left' }}>Occupancy</td><td style={td}>{R.occ.pct}% ({R.occ.sold} of {R.occ.avail} room-nights)</td></tr>
          </tbody>
        </table>
        <b>Daily summary ({cur})</b>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
          <thead><tr><th style={{ ...td, textAlign: 'left' }}>Day</th><th style={td}>Income</th><th style={td}>Expenses</th><th style={td}>Balance</th><th style={td}>Rooms</th></tr></thead>
          <tbody>{R.days.filter((d) => d.inc || d.exp || d.occ).map((d) => (
            <tr key={d.d}><td style={{ ...td, textAlign: 'left' }}>{d.d}</td><td style={td}>{num(d.inc)}</td><td style={td}>{num(d.exp)}</td><td style={td}>{num(d.bal)}</td><td style={td}>{d.occ}</td></tr>))}</tbody>
        </table>
        <p className="small muted">Printed {new Date().toLocaleString('en-GB')}</p>
      </div>
    </>
  );
}

export default function ReportPage() {
  return <Suspense fallback={<div className="empty">Loading…</div>}><Report /></Suspense>;
}
