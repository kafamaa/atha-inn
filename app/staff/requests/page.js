'use client';
import { useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { dS, nights } from '@/lib/util';

export default function Requests() {
  const { requests, open } = useStaff();
  const [f, setF] = useState('new');
  const L = requests.filter((r) => f === 'all' || r.status === f);
  const tag = { new: ['New', 's-arr'], accepted: ['Accepted', 's-ready'], declined: ['Declined', 's-maint'] };
  return (
    <>
      <div className="pagehead"><h1>Website booking requests</h1></div>
      <div className="card">
        <div className="seg" style={{ marginBottom: 6 }}>
          {[['new', 'New'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['all', 'All']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}
        </div>
        {L.length ? <div className="list">{L.map((q) => (
          <button key={q.id} className="item" onClick={() => open('request', { id: q.id })}>
            <div className="grow"><b>{q.guest}</b><span className="small muted">{dS(q.check_in)} → {dS(q.check_out)} · {nights(q.check_in, q.check_out)}n · {q.adults} adult{q.adults === 1 ? '' : 's'} · {q.phone}</span></div>
            <span className={`chip ${tag[q.status][1]}`}>{tag[q.status][0]}</span>
          </button>))}</div>
          : <div className="empty">{f === 'new' ? 'No new requests. Guests can book from your website.' : 'Nothing here'}</div>}
      </div>
    </>
  );
}
