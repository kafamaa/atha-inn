'use client';
import { useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { BillItem, BookingItem, reservations, resCharge, resPaid } from '@/components/Sheets';
import { billState, calc, conv, dS, downloadFile, money, num, paidOf, r2, today } from '@/lib/util';
import { csv, monthLabel, monthReport, shiftMonth } from '@/lib/report';

export default function Finance() {
  const all = useStaff();
  const { txns, bills, bookings, settings, open } = all;
  const [m, setM] = useState(today().slice(0, 7));
  const [tab, setTab] = useState('overview');
  const [tf, setTf] = useState('all');
  const R = monthReport(m, all);
  const cur = R.cur;
  const six = [...Array(6)].map((_, i) => shiftMonth(m, i - 5)).map((k) => { const x = monthReport(k, all); return [k, x.inc, x.exp, x.occ.pct]; });
  const top = Math.max(1, ...six.map((x) => Math.max(x[1], x[2])));
  const mxOut = R.catsOut[0]?.[1] || 1;
  const unpaidBills = bills.filter((b) => b.kind === 'invoice' && billState(b, txns, settings)[0] !== 'Paid');
  const unpaidTotal = unpaidBills.reduce((a, b) => a + conv(Math.max(0, calc(b, settings).total - paidOf(b, txns, settings.fx)), b.currency, cur, settings.fx), 0);
  const noInvoice = reservations(bookings).filter((g) => ['booked', 'in', 'out'].includes(g.status) && !bills.some((b) => b.kind === 'invoice' && b.booking_id === (g.group_id || g.id)))
    .map((g) => ({ g, due: r2(resCharge(g.rows) - resPaid(g.group_id || g.id, txns, cur, settings.fx)) })).filter((x) => x.due > 0);

  const exp = {
    tx: () => downloadFile(`atha-inn-transactions-${m}.csv`, csv([['Date', 'Type', 'Category', 'Amount', 'Currency', 'Method', 'From / to', 'Receipt', 'Note'],
      ...[...R.tx].sort((a, b) => a.date.localeCompare(b.date)).map((x) => [x.date, x.type === 'in' ? 'Income' : 'Expense', x.cat, x.amount, x.currency, x.method, x.payer, x.receipt_no, x.note])]), 'text/csv'),
    daily: () => downloadFile(`atha-inn-daily-${m}.csv`, csv([['Date', `Income (${cur})`, `Expenses (${cur})`, `Balance (${cur})`, 'Rooms occupied'],
      ...R.days.map((d) => [d.d, r2(d.inc), r2(d.exp), r2(d.bal), d.occ]), ['Total', r2(R.inc), r2(R.exp), r2(R.bal), R.occ.sold]]), 'text/csv'),
    year: () => {
      const ms = [...Array(12)].map((_, i) => shiftMonth(m, i - 11));
      downloadFile(`atha-inn-12-months-to-${m}.csv`, csv([['Month', `Income (${cur})`, 'Guest payments', 'Other income', `Expenses (${cur})`, `Balance (${cur})`, 'Occupancy %'],
        ...ms.map((k) => { const x = monthReport(k, all); return [k, r2(x.inc), r2(x.guest), r2(x.other), r2(x.exp), r2(x.bal), x.occ.pct]; })]), 'text/csv');
    },
  };

  const txList = R.tx.filter((x) => tf === 'all' || x.type === tf).sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)));
  return (
    <>
      <div className="pagehead">
        <h1>Finance & Reports</h1>
        <div className="row">
          <button className="btn" onClick={() => open('txnForm', { type: 'in' })}>+ Income</button>
          <button className="btn coral" onClick={() => open('txnForm', { type: 'out' })}>+ Expense</button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={() => setM(shiftMonth(m, -1))} aria-label="Previous month">‹</button>
        <input type="month" value={m} onChange={(e) => e.target.value && setM(e.target.value)} style={{ maxWidth: 190 }} aria-label="Month" />
        <button className="btn sm" onClick={() => setM(shiftMonth(m, 1))} aria-label="Next month">›</button>
      </div>
      <div className="kpis">
        <div className="kpi"><b className="in">{money(R.inc, cur)}</b><span>Income · {monthLabel(m)}</span></div>
        <div className="kpi"><b className="out">{money(R.exp, cur)}</b><span>Expenses</span></div>
        <div className="kpi"><b>{money(R.bal, cur)}</b><span>Balance (income − expenses)</span></div>
        <div className="kpi"><b>{R.occ.pct}%</b><span>Occupancy · {R.occ.sold}/{R.occ.avail} room-nights</span></div>
        <div className="kpi"><b className={unpaidTotal ? 'out' : ''}>{money(unpaidTotal, cur)}</b><span>Unpaid invoice balances</span></div>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>
        {[['overview', 'Summary'], ['daily', 'Daily'], ['tx', 'Transactions'], ['unpaid', 'Unpaid'], ['export', 'Export']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'overview' ? (
        <div className="grid g2">
          <div className="card"><h2>Income</h2>
            <div className="tot" style={{ maxWidth: 'none' }}>
              <div><span>Guest payments (rooms & bills)</span><b>{money(R.guest, cur)}</b></div>
              <div><span>Other income</span><b>{money(R.other, cur)}</b></div>
              {R.catsIn.map(([c, v]) => <div key={c} className="small muted"><span>· {c}</span><span>{num(v)}</span></div>)}
              <div className="grand"><span>Total income</span><span>{money(R.inc, cur)}</span></div>
            </div>
          </div>
          <div className="card"><h2>Expenses by category</h2>
            {R.catsOut.length ? <div className="bars">{R.catsOut.map(([c, v]) => <div className="br" key={c}><span>{c}</span><span className="tr"><i style={{ width: `${(v / mxOut) * 100}%` }} /></span><span className="amt">{num(v)}</span></div>)}</div>
              : <div className="empty">No expenses this month</div>}
          </div>
          <div className="card"><h2>Last 6 months</h2>
            <div className="months">{six.map(([k, i, o, p]) => (
              <div className="m" key={k} title={`${k}: income ${num(i)}, expenses ${num(o)}, occupancy ${p}%`}>
                <div className="pair"><i style={{ height: `${(i / top) * 100}%` }} /><i style={{ height: `${(o / top) * 100}%` }} /></div>
                {new Date(k + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}<br />{p}%
              </div>))}</div>
            <div className="small muted" style={{ marginTop: 6 }}><span className="in">■</span> Income &nbsp; <span className="out">■</span> Expenses · % = occupancy</div>
          </div>
        </div>
      ) : tab === 'daily' ? (
        <div className="card scroll">
          <table className="daytable">
            <thead><tr><th>Day</th><th>Income</th><th>Expenses</th><th>Balance</th><th>Rooms occupied</th></tr></thead>
            <tbody>
              {R.days.map((d) => (
                <tr key={d.d} style={d.d === today() ? { background: 'var(--soft)' } : undefined}>
                  <td>{new Date(d.d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className={d.inc ? 'in' : 'muted'}>{num(d.inc)}</td><td className={d.exp ? 'out' : 'muted'}>{num(d.exp)}</td><td>{num(d.bal)}</td><td>{d.occ}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800 }}><td>Total</td><td>{num(R.inc)}</td><td>{num(R.exp)}</td><td>{num(R.bal)}</td><td>{R.occ.sold}</td></tr>
            </tbody>
          </table>
        </div>
      ) : tab === 'tx' ? (
        <div className="card">
          <div className="seg" style={{ marginBottom: 6 }}>{[['all', 'All'], ['in', 'Income'], ['out', 'Expenses']].map(([k, l]) => <button key={k} className={tf === k ? 'on' : ''} onClick={() => setTf(k)}>{l}</button>)}</div>
          {txList.length ? <div className="list">{txList.map((x) => (
            <button key={x.id} className="item" onClick={() => open('txnForm', { id: x.id })}>
              <div className="grow"><b>{x.cat}{x.payer ? ` · ${x.payer}` : ''}</b><span className="small muted">{dS(x.date)} · {x.method}{x.receipt_no ? ` · ${x.receipt_no}` : ''}{x.note ? ` · ${x.note}` : ''}</span></div>
              <span className={`amt ${x.type}`}>{x.type === 'in' ? '+' : '−'}{money(x.amount, x.currency)}</span>
            </button>))}</div> : <div className="empty">Nothing recorded this month</div>}
        </div>
      ) : tab === 'unpaid' ? (
        <div className="grid g2">
          <div className="card"><h2>Unpaid & partly paid invoices</h2>
            {unpaidBills.length ? <div className="list">{unpaidBills.map((b) => <BillItem key={b.id} b={b} />)}</div> : <div className="empty">All invoices are paid</div>}
          </div>
          <div className="card"><h2>Reservations with a balance (no invoice yet)</h2>
            {noInvoice.length ? <div className="list">{noInvoice.map(({ g, due }) => <BookingItem key={g.id} b={g} tag={`Owes ${money(due, cur)}`} />)}</div> : <div className="empty">None</div>}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Export reports · {monthLabel(m)}</h2>
          <div className="list">
            <button className="item" onClick={exp.tx}><div className="grow"><b>All transactions (CSV)</b><span className="small muted">Every income and expense this month — opens in Excel or Google Sheets</span></div></button>
            <button className="item" onClick={exp.daily}><div className="grow"><b>Daily summary (CSV)</b><span className="small muted">Income, expenses, balance and rooms occupied for each day</span></div></button>
            <button className="item" onClick={exp.year}><div className="grow"><b>12-month summary (CSV)</b><span className="small muted">Monthly income, expenses, balance and occupancy</span></div></button>
            <a className="item" href={`/staff/finance/print?m=${m}`} target="_blank" rel="noopener" style={{ color: 'var(--ink)', textDecoration: 'none' }}><div className="grow"><b>Monthly report (print / PDF)</b><span className="small muted">One page summary to print or save as PDF</span></div></a>
          </div>
        </div>
      )}
    </>
  );
}
