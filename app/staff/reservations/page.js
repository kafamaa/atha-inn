'use client';
import { useEffect, useState } from 'react';
import { useStaff } from '@/lib/staffContext';
import { BookingItem, reservations } from '@/components/Sheets';
import { Legend } from '@/components/RoomBoard';
import { BST, addD, dL, gid, nights, today } from '@/lib/util';

function Calendar() {
  const { rooms, bookings, open } = useStaff();
  const [start, setStart] = useState(addD(today(), -1));
  const N = 14;
  const days = [...Array(N)].map((_, i) => addD(start, i));
  const t = today();
  if (!rooms.length) return <div className="card empty">Add rooms first (Website & Gallery → Rooms)</div>;
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row">
          <button className="btn sm" onClick={() => setStart(addD(start, -7))}>‹ Week</button>
          <button className="btn sm" onClick={() => setStart(addD(today(), -1))}>Today</button>
          <button className="btn sm" onClick={() => setStart(addD(start, 7))}>Week ›</button>
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} style={{ width: 'auto' }} aria-label="Start date" />
        </div>
        <span className="small muted">Tap an empty box to book that room</span>
      </div>
      <div className="scroll">
        <table className="cal">
          <thead><tr><th />{days.map((d) => { const x = new Date(d + 'T00:00:00'); return <th key={d} className={d === t ? 'today' : ''}>{x.toLocaleDateString('en-GB', { weekday: 'short' })}<br />{x.getDate()}</th>; })}</tr></thead>
          <tbody>
            {rooms.map((r) => {
              const cells = [];
              for (let i = 0; i < N;) {
                const d = days[i];
                const b = bookings.find((x) => x.room_id === r.id && ['booked', 'in', 'out'].includes(x.status) && x.check_in <= d && d < x.check_out);
                if (b) {
                  const span = Math.min(nights(d, b.check_out), N - i);
                  const s = BST[b.status];
                  cells.push(<td key={d} colSpan={span}><button className={`bk ${s[1]}`} title={`${b.guest} · ${s[0]}`} onClick={() => open('booking', { g: gid(b) })}>{b.guest}</button></td>);
                  i += span;
                } else {
                  cells.push(<td key={d}><button className="free" aria-label={`Book ${r.name} on ${d}`} onClick={() => open('bookingForm', { pre: { room_ids: [r.id], check_in: d, check_out: addD(d, 1), rate: r.rate } })} /></td>);
                  i += 1;
                }
              }
              return <tr key={r.id}><td className="rm">{r.name}</td>{cells}</tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="legend" style={{ marginTop: 8 }}>
        <span><i style={{ background: '#ece6fb' }} />Confirmed</span><span><i style={{ background: 'var(--occbg)' }} />Checked in</span><span><i style={{ background: 'var(--okbg)' }} />Checked out</span>
      </div>
    </div>
  );
}

function RoomsOn() {
  const { rooms, bookings, open } = useStaff();
  const [d, setD] = useState(today());
  const state = (r) => {
    const b = bookings.find((x) => x.room_id === r.id && ['booked', 'in'].includes(x.status) && x.check_in <= d && d < x.check_out);
    if (b?.status === 'in') return ['occ', 'Occupied', b];
    if (b) return ['arr', 'Reserved', b];
    if (r.status === 'maint') return ['maint', 'Maintenance'];
    if (r.status === 'cleaning' && d === today()) return ['clean', 'Needs cleaning'];
    return ['ready', 'Available'];
  };
  const list = rooms.map((r) => [r, state(r)]);
  const count = (k) => list.filter(([, s]) => s[0] === k).length;
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <label style={{ minWidth: 200 }}>Night of<input type="date" value={d} onChange={(e) => e.target.value && setD(e.target.value)} /></label>
        <div className="row small"><span className="chip s-ready">{count('ready')} available</span><span className="chip s-occ">{count('occ')} occupied</span><span className="chip s-arr">{count('arr')} reserved</span></div>
      </div>
      <div className="board">
        {list.map(([r, s]) => (
          <button key={r.id} className={`tile s-${s[0]}`} onClick={() => (s[2] ? open('booking', { g: gid(s[2]) }) : open('room', { id: r.id }))}>
            <span className="rn">{r.name}</span><span className="st">{s[1]}</span>
            {s[2] ? <span className="gu">{s[2].guest}</span> : <span className="sub">{r.type}</span>}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><Legend /></div>
    </div>
  );
}

export default function Reservations() {
  const { bookings, open } = useStaff();
  const [tab, setTab] = useState('list');
  const [f, setF] = useState('upcoming');
  const [q, setQ] = useState('');
  const res = reservations(bookings);
  const req = res.filter((b) => b.status === 'request');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t) setTab(t); else if (req.length) setTab('requests');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const t = today();
  let L = res.filter((b) => {
    if (f === 'upcoming') return b.status === 'booked';
    if (f === 'in') return b.status === 'in';
    if (f === 'out') return b.status === 'out';
    if (f === 'cancel') return b.status === 'cancel';
    return b.status !== 'request';
  });
  if (q) { const s = q.toLowerCase(); L = L.filter((b) => [b.guest, b.phone, b.email, b.country].join(' ').toLowerCase().includes(s)); }
  L = [...L].sort((a, b) => (['upcoming', 'in'].includes(f) ? a.check_in.localeCompare(b.check_in) : b.check_in.localeCompare(a.check_in)));
  const tabs = [['requests', `Requests${req.length ? ` (${req.length})` : ''}`], ['list', 'Reservations'], ['cal', 'Calendar'], ['rooms', 'Rooms']];
  return (
    <>
      <div className="pagehead">
        <h1>Reservations</h1>
        <button className="btn coral" onClick={() => open('bookingForm')}>+ New reservation</button>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'cal' ? <Calendar /> : tab === 'rooms' ? <RoomsOn /> : tab === 'requests' ? (
        <div className="card">
          <p className="muted" style={{ marginTop: 0 }}>Booking requests from your website, newest first. Open one to confirm it and assign rooms.</p>
          {req.length ? <div className="list">{[...req].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((b) => (
            <BookingItem key={b.id} b={b} tag={`New · ${dL(String(b.created_at).slice(0, 10))}`} />))}</div>
            : <div className="empty">No new requests</div>}
        </div>
      ) : (
        <div className="card">
          <input type="search" placeholder="Search guest, phone, email" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
          <div className="seg" style={{ marginBottom: 6 }}>
            {[['upcoming', 'Confirmed'], ['in', 'Checked in'], ['out', 'Checked out'], ['cancel', 'Cancelled'], ['all', 'All']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}
          </div>
          {L.length ? <div className="list">{L.map((b) => <BookingItem key={b.id} b={b} tag={b.status === 'booked' && b.check_in === t ? 'Arriving today' : undefined} />)}</div> : <div className="empty">No reservations here</div>}
        </div>
      )}
    </>
  );
}
