'use client';
import Link from 'next/link';
import { useStaff } from '@/lib/staffContext';
import { BookingItem, BillItem, reservations } from '@/components/Sheets';
import { Legend, RoomBoard } from '@/components/RoomBoard';
import { addD, billState, conv, money, occupancy, today } from '@/lib/util';

export default function Dashboard() {
  const { rooms, bookings, bills, txns, settings, open } = useStaff();
  const t = today();
  const cur = settings.base || 'MVR';
  if (!rooms.length) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: 'auto' }}>
        <h2>Welcome to {settings.name || 'Atha Inn'}</h2>
        <p className="muted">Start by adding your rooms, prices and photos.</p>
        <Link className="btn pri" href="/staff/website?tab=rooms">Add rooms</Link>
      </div>
    );
  }
  const res = reservations(bookings);
  const occ = bookings.filter((b) => ['booked', 'in'].includes(b.status) && b.room_id && b.check_in <= t && t < b.check_out).length;
  const req = res.filter((b) => b.status === 'request');
  const arr = res.filter((b) => b.status === 'booked' && b.check_in <= t);
  const dep = res.filter((b) => b.status === 'in' && b.check_out <= t);
  const up = res.filter((b) => b.status === 'booked' && b.check_in > t && b.check_in <= addD(t, 7)).sort((a, b) => a.check_in.localeCompare(b.check_in));
  const unpaid = bills.filter((b) => b.kind === 'invoice' && billState(b, txns, settings)[0] !== 'Paid');
  const m = t.slice(0, 7);
  const mt = txns.filter((x) => (x.date || '').startsWith(m));
  const sum = (type) => mt.filter((x) => x.type === type).reduce((a, x) => a + conv(x.amount, x.currency, cur, settings.fx), 0);
  const inc = sum('in'), exp = sum('out');
  const mOcc = occupancy(rooms, bookings, m + '-01', addD(m + '-01', new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate()));
  return (
    <>
      <div className="kpis">
        <div className="kpi"><b>{occ}/{rooms.length}</b><span>Rooms occupied tonight</span></div>
        <div className="kpi"><b className={req.length ? 'out' : ''}>{req.length}</b><span>New booking requests</span></div>
        <div className="kpi"><b>{arr.length} · {dep.length}</b><span>Arrivals · departures today</span></div>
        <div className="kpi"><b>{mOcc.pct}%</b><span>Occupancy this month</span></div>
        <div className="kpi"><b className={inc - exp >= 0 ? 'in' : 'out'}>{money(inc - exp, cur)}</b><span>Balance this month</span></div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Rooms tonight</h2><Legend /></div>
        <RoomBoard />
      </div>
      <div className="grid g2">
        {req.length ? (
          <div className="card"><h2>New requests</h2><div className="list">{req.map((b) => <BookingItem key={b.id} b={b} />)}</div></div>
        ) : null}
        <div className="card"><h2>Arrivals & departures</h2>
          {arr.length || dep.length ? <div className="list">{arr.map((b) => <BookingItem key={b.id} b={b} tag="Arriving" />)}{dep.map((b) => <BookingItem key={b.id} b={b} tag="Departing" />)}</div>
            : <div className="empty">No arrivals or departures today</div>}
        </div>
        <div className="card"><h2>Next 7 days</h2>
          {up.length ? <div className="list">{up.map((b) => <BookingItem key={b.id} b={b} />)}</div> : <div className="empty">No confirmed arrivals this week</div>}
        </div>
        <div className="card"><h2>Unpaid invoices</h2>
          {unpaid.length ? <div className="list">{unpaid.map((b) => <BillItem key={b.id} b={b} />)}</div> : <div className="empty">All invoices are paid</div>}
        </div>
        <div className="card"><h2>This month</h2>
          <div className="tot" style={{ maxWidth: 'none' }}>
            <div><span>Income</span><b className="in">{money(inc, cur)}</b></div>
            <div><span>Expenses</span><b className="out">{money(exp, cur)}</b></div>
            <div className="grand"><span>Balance</span><span>{money(inc - exp, cur)}</span></div>
          </div>
          <div className="actions"><button className="btn" onClick={() => open('txnForm', { type: 'in' })}>+ Income</button><button className="btn" onClick={() => open('txnForm', { type: 'out' })}>+ Expense</button><Link className="btn" href="/staff/finance">Reports</Link></div>
        </div>
      </div>
      <button className="btn coral fab" onClick={() => open('bookingForm')}>+ New reservation</button>
    </>
  );
}
