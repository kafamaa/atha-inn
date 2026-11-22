'use client';
import { useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { BookingItem } from '@/components/Sheets';
import { BST, addD, nights, today } from '@/lib/util';

function Calendar() {
  const { rooms, bookings, open } = useStaff();
  const [start, setStart] = useState(addD(today(), -1));
  const N = 14;
  const days = [...Array(N)].map((_, i) => addD(start, i));
  const t = today();
  if (!rooms.length) return <div className="card empty">Add rooms first</div>;
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row">
          <button className="btn sm" onClick={() => setStart(addD(start, -7))}>‹ Week</button>
          <button className="btn sm" onClick={() => setStart(addD(today(), -1))}>Today</button>
          <button className="btn sm" onClick={() => setStart(addD(start, 7))}>Week ›</button>
        </div>
        <span className="small muted">Tap an empty box to book that night</span>
      </div>
      <div className="scroll">
        <table className="cal">
          <thead><tr><th />{days.map((d) => { const x = new Date(d + 'T00:00:00'); return <th key={d} className={d === t ? 'today' : ''}>{x.toLocaleDateString('en-GB', { weekday: 'short' })}<br />{x.getDate()}</th>; })}</tr></thead>
          <tbody>
            {rooms.map((r) => {
              const cells = [];
              for (let i = 0; i < N;) {
                const d = days[i];
                const b = bookings.find((x) => x.room_id === r.id && x.status !== 'cancel' && x.check_in <= d && d < x.check_out);
                if (b) {
                  const span = Math.min(nights(d, b.check_out), N - i);
                  const s = BST[b.status] || BST.booked;
                  cells.push(<td key={d} colSpan={span}><button className={`bk ${s[1]}`} title={b.guest} onClick={() => open('booking', { id: b.id })}>{b.guest}</button></td>);
                  i += span;
                } else {
                  cells.push(<td key={d}><button className="free" aria-label={`Book ${r.name} on ${d}`} onClick={() => open('bookingForm', { pre: { room_id: r.id, check_in: d, check_out: addD(d, 1), rate: r.rate } })} /></td>);
                  i += 1;
                }
              }
              return <tr key={r.id}><td className="rm">{r.name}</td>{cells}</tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Bookings() {
  const { bookings, rooms, open } = useStaff();
  const [mode, setMode] = useState('list');
  const [f, setF] = useState('upcoming');
  const [q, setQ] = useState('');
  let L = bookings.filter((b) => (f === 'upcoming' ? b.status === 'booked' : f === 'in' ? b.status === 'in' : f === 'past' ? b.status === 'out' : f === 'cancel' ? b.status === 'cancel' : true));
  if (q) {
    const s = q.toLowerCase();
    L = L.filter((b) => [b.guest, b.phone, rooms.find((r) => r.id === b.room_id)?.name, b.country].join(' ').toLowerCase().includes(s));
  }
  L = [...L].sort((a, b) => (f === 'upcoming' || f === 'in' ? a.check_in.localeCompare(b.check_in) : b.check_in.localeCompare(a.check_in)));
  return (
    <>
      <div className="pagehead">
        <h1>Bookings</h1>
        <div className="row">
          <div className="seg">{[['list', 'List'], ['cal', 'Calendar']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</div>
          <button className="btn coral" onClick={() => open('bookingForm')}>+ New booking</button>
        </div>
      </div>
      {mode === 'cal' ? <Calendar /> : (
        <div className="card">
          <input type="search" placeholder="Search guest, phone or room" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
          <div className="seg" style={{ marginBottom: 6 }}>
            {[['upcoming', 'Upcoming'], ['in', 'In house'], ['past', 'Past'], ['cancel', 'Cancelled'], ['all', 'All']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}
          </div>
          {L.length ? <div className="list">{L.map((b) => <BookingItem key={b.id} b={b} />)}</div> : <div className="empty">No bookings here</div>}
        </div>
      )}
    </>
  );
}
