'use client';
import { useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { BillItem, ReceiptItem } from '@/components/Sheets';
import { billState, calc, conv, money, paidOf } from '@/lib/util';

export default function Billing() {
  const { bills, txns, settings, open } = useStaff();
  const [tab, setTab] = useState('invoice');
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');
  const s = q.toLowerCase();
  const cur = settings.base || 'MVR';
  const invoices = bills.filter((b) => b.kind === 'invoice');
  const outstanding = invoices.reduce((a, b) => a + conv(Math.max(0, calc(b, settings).total - paidOf(b, txns, settings.fx)), b.currency, cur, settings.fx), 0);
  const unpaidN = invoices.filter((b) => billState(b, txns, settings)[0] !== 'Paid').length;
  let L = [];
  if (tab === 'receipt') {
    L = txns.filter((t) => t.type === 'in' && t.receipt_no && (!s || [t.payer, t.note, t.receipt_no].join(' ').toLowerCase().includes(s)));
  } else {
    L = bills.filter((b) => b.kind === tab && (!s || [b.customer, b.no, b.phone].join(' ').toLowerCase().includes(s)))
      .filter((b) => tab !== 'invoice' || f === 'all' || billState(b, txns, settings)[0] === f)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.seq || 0) - (a.seq || 0));
  }
  return (
    <>
      <div className="pagehead">
        <h1>Billing & Payments</h1>
        <div className="row">
          <button className="btn" onClick={() => open('billForm', { kind: 'quote' })}>+ Quotation</button>
          <button className="btn" onClick={() => open('payment', { link: {}, kind: 'Full payment' })}>+ Receipt</button>
          <button className="btn coral" onClick={() => open('billForm', { kind: 'invoice' })}>+ Invoice</button>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><b>{unpaidN}</b><span>Invoices not fully paid</span></div>
        <div className="kpi"><b className={outstanding ? 'out' : ''}>{money(outstanding, cur)}</b><span>Remaining balances</span></div>
      </div>
      <div className="card">
        <div className="seg" style={{ marginBottom: 10 }}>
          {[['invoice', 'Invoices'], ['quote', 'Quotations'], ['receipt', 'Receipts']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <input type="search" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        {tab === 'invoice' ? (
          <div className="seg" style={{ marginBottom: 6 }}>
            {['all', 'Unpaid', 'Partially paid', 'Paid'].map((k) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{k === 'all' ? 'All' : k}</button>)}
          </div>
        ) : null}
        {L.length ? <div className="list">{tab === 'receipt' ? L.map((t) => <ReceiptItem key={t.id} t={t} />) : L.map((b) => <BillItem key={b.id} b={b} />)}</div>
          : <div className="empty">Nothing here yet</div>}
        {tab === 'receipt' ? <p className="small muted">Receipts are made automatically each time you record a payment or deposit.</p> : null}
      </div>
    </>
  );
}
