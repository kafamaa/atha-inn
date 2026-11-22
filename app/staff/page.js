'use client';
import { useStaff } from '@/lib/staffContext';
import { BookingItem, BillItem } from '@/components/Sheets';
import { addD, billState, conv, dS, money, nights, roomState, today } from '@/lib/util';

export default function Today() {
  const { rooms, bookings, requests, bills, txns, settings, isAdmin, open } = useStaff();
  const t = today();
  const cur = settings.base || 'MVR';
  if (!rooms.length) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: 'auto' }}>
        <h2>Welcome</h2>
        <p className="muted">{isAdmin ? 'Start by adding your rooms in the Rooms tab.' : 'The owner has not added any rooms yet.'}</p>
      </div>
    );
  }
  const occ = bookings.filter((b) => ['booked', 'in'].includes(b.status) && b.check_in <= t && t < b.check_out).length;
  const arr = bookings.filter((b) => b.status === 'booked' && b.check_in === t);
  const dep = bookings.filter((b) => b.status === 'in' && b.check_out <= t);
  const up = bookings.filter((b) => b.status === 'booked' && b.check_in > t && b.check_in <= addD(t, 7));
  const newReq = requests.filter((r) => r.status === 'new');
  const unpaid = bills.filter((b) => b.kind === 'invoice' && ['Unpaid', 'Overdue', 'Part paid'].includes(billState(b, txns, settings)[0]));
  const m = t.slice(0, 7);
  const mt = txns.filter((x) => (x.date || '').startsWith(m));
  const inc = mt.filter((x) => x.type === 'in').reduce((a, x) => a + conv(x.amount, x.currency, cur, settings.fx), 0);
  const exp = mt.filter((x) => x.type === 'out').reduce((a, x) => a + conv(x.amount, x.currency, cur, settings.fx), 0);
  return (
    <>
      <div className="kpis">
        <div className="kpi"><b>{occ}/{rooms.length}</b><span>Rooms occupied tonight</span></div>
        <div className="kpi"><b>{arr.length}</b><span>Arrivals today</span></div>
        <div className="kpi"><b>{dep.length}</b><span>Check-outs due</span></div>
        {isAdmin ? <div className="kpi"><b className={inc - exp >= 0 ? 'in' : 'out'}>{money(inc - exp, cur)}</b><span>Profit this month</span></div>
          : <div className="kpi"><b>{newReq.length}</b><span>New website requests</span></div>}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Room board</h2><span className="small muted">Tap a room for actions</span></div>
        <div className="board">
          {rooms.map((r) => {
            const s = roomState(r, bookings);
            return (
              <button key={r.id} className={`tile s-${s.k}`} onClick={() => open('room', { id: r.id })}>
                <span className="rn">{r.name}</span><span className="st">{s.lab}</span>
                {s.b ? <><span className="gu">{s.b.guest}</span><span className="sub">{s.k === 'occ' ? `until ${dS(s.b.check_out)}` : `${nights(s.b.check_in, s.b.check_out)} nights`}</span></>
                  : <span className="sub">{r.type}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid g2">
        {newReq.length ? (
          <div className="card"><h2>New website requests</h2><div className="list">
            {newReq.map((q) => (
              <button key={q.id} className="item" onClick={() => open('request', { id: q.id })}>
                <div className="grow"><b>{q.guest}</b><span className="small muted">{dS(q.check_in)} → {dS(q.check_out)} · {q.phone}</span></div>
                <span className="chip s-arr">New</span>
              </button>))}
          </div></div>
        ) : null}
        <div className="card"><h2>Arrivals & check-outs</h2>
          {arr.length || dep.length ? <div className="list">{arr.map((b) => <BookingItem key={b.id} b={b} tag="Arriving" />)}{dep.map((b) => <BookingItem key={b.id} b={b} tag="Check out" />)}</div>
            : <div className="empty">No arrivals or check-outs today</div>}
        </div>
        <div className="card"><h2>Next 7 days</h2>
          {up.length ? <div className="list">{up.map((b) => <BookingItem key={b.id} b={b} />)}</div> : <div className="empty">No upcoming bookings this week</div>}
        </div>
        <div className="card"><h2>Waiting for payment</h2>
          {unpaid.length ? <div className="list">{unpaid.map((b) => <BillItem key={b.id} b={b} />)}</div> : <div className="empty">All invoices are paid</div>}
        </div>
      </div>
      <button className="btn coral fab" onClick={() => open('bookingForm')}>+ New booking</button>
    </>
  );
}
