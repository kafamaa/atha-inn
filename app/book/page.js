'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/PublicNav';
import { addD, today, nights, num, dL, waLink } from '@/lib/util';

function BookForm() {
  const params = useSearchParams();
  const [info, setInfo] = useState({});
  const [ci, setCi] = useState(addD(today(), 1));
  const [co, setCo] = useState(addD(today(), 3));
  const [rooms, setRooms] = useState(null);
  const [roomId, setRoomId] = useState(params.get('room') || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    supabase.from('public_info').select('*').maybeSingle().then(({ data }) => setInfo(data || {}));
  }, []);
  useEffect(() => {
    if (!ci || !co || co <= ci) { setRooms([]); return; }
    let live = true;
    setRooms(null);
    supabase.rpc('available_rooms', { ci, co }).then(({ data, error }) => {
      if (!live) return;
      if (error) { setErr('Could not check availability. Please WhatsApp us.'); setRooms([]); return; }
      setRooms(data || []);
    });
    return () => { live = false; };
  }, [ci, co]);

  const n = nights(ci, co);
  const cur = info.base || 'MVR';
  const name = info.name || 'Atha Inn';
  const wa = info.whatsapp || '9607587079';
  const chosen = rooms?.find((r) => r.id === roomId);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (rooms && rooms.length === 0) return setErr('No rooms are free for these dates. Please try other dates or WhatsApp us.');
    setBusy(true);
    const p = { ...f, check_in: ci, check_out: co, room_id: chosen ? roomId : '' };
    const { error } = await supabase.rpc('request_booking', { p });
    setBusy(false);
    if (error) return setErr(error.message || 'Something went wrong. Please WhatsApp us.');
    setDone({ ...p, roomName: chosen ? `${chosen.type || 'Room'} ${chosen.name}` : 'Any room' });
  }

  if (done) {
    const text = `Hello ${name}, I just sent a booking request: ${done.guest}, ${dL(done.check_in)} to ${dL(done.check_out)}, ${done.roomName}, ${done.adults} adult(s).`;
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Request sent</h1>
        <p>Thank you, {done.guest}. We will confirm your stay from {dL(done.check_in)} to {dL(done.check_out)} by phone or WhatsApp soon.</p>
        <p className="muted">Your booking is confirmed only after we reply.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn coral" href={waLink(wa, text)} target="_blank" rel="noopener">Also message us on WhatsApp</a>
          <a className="btn" href="/">Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Request a booking</h1>
      <p className="muted" style={{ marginTop: 0 }}>Choose your dates, then pick a room. We confirm every request personally.</p>
      <div className="fg">
        <label>Check-in<input type="date" required min={today()} value={ci} onChange={(e) => { setCi(e.target.value); if (co <= e.target.value) setCo(addD(e.target.value, 1)); }} /></label>
        <label>Check-out<input type="date" required min={addD(ci || today(), 1)} value={co} onChange={(e) => setCo(e.target.value)} /></label>
        <label>Adults<input name="adults" type="number" min="1" max="20" defaultValue="2" /></label>
        <label>Children<input name="children" type="number" min="0" max="20" defaultValue="0" /></label>
      </div>

      <h2 style={{ fontSize: 18, margin: '20px 0 10px' }}>{n > 0 ? `Free rooms · ${n} night${n === 1 ? '' : 's'}` : 'Choose your dates'}</h2>
      {rooms === null ? <p className="muted">Checking…</p> : rooms.length === 0 ? (
        <p className="out">No rooms free for these dates. Try other dates or WhatsApp us.</p>
      ) : (
        <div className="pick">
          <label className={`opt ${roomId === '' || !chosen ? 'on' : ''}`}>
            <input type="radio" name="pickroom" checked={!chosen} onChange={() => setRoomId('')} />
            <span>Any free room — we'll choose the best one for you</span>
          </label>
          {rooms.map((r) => (
            <label key={r.id} className={`opt ${roomId === r.id ? 'on' : ''}`}>
              <input type="radio" name="pickroom" checked={roomId === r.id} onChange={() => setRoomId(r.id)} />
              <span style={{ flex: 1 }}><b>{r.type || 'Room'} {r.name}</b><br /><span className="small muted">Up to {r.max_guests} guests</span></span>
              <span className="amt">{cur} {num(r.rate)}<br /><span className="small muted">{n > 0 ? `${cur} ${num(r.rate * n)} total` : '/ night'}</span></span>
            </label>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18, margin: '20px 0 10px' }}>Your details</h2>
      <div className="fg">
        <label>Full name<input name="guest" required maxLength={120} autoComplete="name" /></label>
        <label>Phone / WhatsApp<input name="phone" type="tel" required maxLength={40} autoComplete="tel" placeholder="+960 …" /></label>
        <label>Email (optional)<input name="email" type="email" maxLength={120} autoComplete="email" /></label>
        <label>Country<input name="country" maxLength={60} autoComplete="country-name" /></label>
        <label className="full">Message (arrival time, transfer, requests)<textarea name="message" maxLength={1000} /></label>
      </div>
      {err ? <p className="out">{err}</p> : null}
      <div className="actions">
        <button className="btn coral" disabled={busy || n < 1}>{busy ? 'Sending…' : 'Send booking request'}</button>
        <a className="btn" href={waLink(wa, `Hello ${name}, I would like to book a room.`)} target="_blank" rel="noopener">Ask on WhatsApp</a>
      </div>
      <p className="small muted">Prices are per room per night and may not include taxes. Final price is on your confirmation.</p>
    </form>
  );
}

export default function BookPage() {
  return (
    <>
      <PublicNav info={null} />
      <main className="book-wrap">
        <Suspense fallback={<div className="empty">Loading…</div>}>
          <BookForm />
        </Suspense>
      </main>
    </>
  );
}
