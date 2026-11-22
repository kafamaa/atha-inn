'use client';
import { useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { BillItem } from '@/components/Sheets';

export default function Bills() {
  const { bills, open } = useStaff();
  const [f, setF] = useState('invoice');
  const [q, setQ] = useState('');
  const s = q.toLowerCase();
  const L = bills.filter((b) => b.kind === f && (!s || [b.customer, b.no, b.phone].join(' ').toLowerCase().includes(s)))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.seq || 0) - (a.seq || 0));
  return (
    <>
      <div className="pagehead">
        <h1>Quotations & invoices</h1>
        <div className="row">
          <button className="btn" onClick={() => open('billForm', { kind: 'quote' })}>+ Quotation</button>
          <button className="btn coral" onClick={() => open('billForm', { kind: 'invoice' })}>+ Invoice</button>
        </div>
      </div>
      <div className="card">
        <input type="search" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        <div className="seg" style={{ marginBottom: 6 }}>
          {[['invoice', 'Invoices'], ['quote', 'Quotations']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}
        </div>
        {L.length ? <div className="list">{L.map((b) => <BillItem key={b.id} b={b} />)}</div> : <div className="empty">No {f === 'quote' ? 'quotations' : 'invoices'} yet</div>}
      </div>
    </>
  );
}
