'use client';
import { useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { conv, dS, downloadFile, iso, money, num, today } from '@/lib/util';

export default function Money() {
  const { txns, settings, isAdmin, open } = useStaff();
  const [m, setM] = useState(today().slice(0, 7));
  if (!isAdmin) return <div className="card empty">Only the owner can see income and expenses.</div>;
  const cur = settings.base || 'MVR';
  const base = (x) => conv(x.amount, x.currency, cur, settings.fx);
  const tx = txns.filter((x) => (x.date || '').startsWith(m));
  const inc = tx.filter((x) => x.type === 'in').reduce((a, x) => a + base(x), 0);
  const exp = tx.filter((x) => x.type === 'out').reduce((a, x) => a + base(x), 0);
  const cats = {};
  tx.filter((x) => x.type === 'out').forEach((x) => { cats[x.cat] = (cats[x.cat] || 0) + base(x); });
  const ce = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const mx = ce[0]?.[1] || 1;
  const ms = [...Array(6)].map((_, i) => { const d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() - 5 + i); return iso(d).slice(0, 7); });
  const mv = ms.map((k) => { const T = txns.filter((x) => (x.date || '').startsWith(k)); return [k, T.filter((x) => x.type === 'in').reduce((a, x) => a + base(x), 0), T.filter((x) => x.type === 'out').reduce((a, x) => a + base(x), 0)]; });
  const top = Math.max(1, ...mv.map((x) => Math.max(x[1], x[2])));
  const shift = (n) => { const d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + n); setM(iso(d).slice(0, 7)); };
  const label = new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  function csv() {
    const rows = [['Date', 'Type', 'Category', 'Amount', 'Currency', 'Method', 'Note'], ...[...tx].reverse().map((x) => [x.date, x.type === 'in' ? 'Income' : 'Expense', x.cat, x.amount, x.currency, x.method, x.note || ''])];
    downloadFile(`atha-inn-${m}.csv`, rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  }
  return (
    <>
      <div className="pagehead">
        <h1>Income & expenses</h1>
        <div className="row">
          <button className="btn" onClick={() => open('txnForm', { type: 'in' })}>+ Income</button>
          <button className="btn coral" onClick={() => open('txnForm', { type: 'out' })}>+ Expense</button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <input type="month" value={m} onChange={(e) => e.target.value && setM(e.target.value)} style={{ maxWidth: 190 }} />
        <button className="btn sm" onClick={() => shift(1)} aria-label="Next month">›</button>
        <button className="btn sm" onClick={csv}>Download CSV</button>
      </div>
      <div className="kpis">
        <div className="kpi"><b className="in">{money(inc, cur)}</b><span>Income · {label}</span></div>
        <div className="kpi"><b className="out">{money(exp, cur)}</b><span>Expenses</span></div>
        <div className="kpi"><b>{money(inc - exp, cur)}</b><span>Profit</span></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 14 }}>
        <div className="card"><h2>Last 6 months</h2>
          <div className="months">{mv.map(([k, i, o]) => (
            <div className="m" key={k} title={`${k}: in ${num(i)}, out ${num(o)}`}>
              <div className="pair"><i style={{ height: `${(i / top) * 100}%` }} /><i style={{ height: `${(o / top) * 100}%` }} /></div>
              {new Date(k + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
            </div>))}</div>
          <div className="small muted" style={{ marginTop: 6 }}><span className="in">■</span> Income &nbsp; <span className="out">■</span> Expenses · in {cur}</div>
        </div>
        <div className="card"><h2>Where money went</h2>
          {ce.length ? <div className="bars">{ce.map(([c, v]) => <div className="br" key={c}><span>{c}</span><span className="tr"><i style={{ width: `${(v / mx) * 100}%` }} /></span><span className="amt">{num(v)}</span></div>)}</div>
            : <div className="empty">No expenses this month</div>}
        </div>
      </div>
      <div className="card"><h2>Entries</h2>
        {tx.length ? <div className="list">{tx.map((x) => (
          <button key={x.id} className="item" onClick={() => open('txnForm', { id: x.id })}>
            <div className="grow"><b>{x.cat}</b><span className="small muted">{dS(x.date)} · {x.method}{x.note ? ` · ${x.note}` : ''}</span></div>
            <span className={`amt ${x.type}`}>{x.type === 'in' ? '+' : '−'}{money(x.amount, x.currency)}</span>
          </button>))}</div> : <div className="empty">Nothing recorded this month</div>}
      </div>
    </>
  );
}
