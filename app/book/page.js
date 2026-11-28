'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/PublicNav';
import { addD, ATHA_WHATSAPP, today, nights, num, dL, waLink } from '@/lib/util';

function BookForm() {
  const params = useSearchParams();
  const [info, setInfo] = useState({});
  const [ci, setCi] = useState(addD(today(), 1));
  const [co, setCo] = useState(addD(today(), 3));
  const [rooms, setRooms] = useState(null);
  const [picks, setPicks] = useState(params.get('room') ? [params.get('room')] : []);
  const [count, setCount] = useState(1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [extras, setExtras] = useState({ breakfast: false, kitchen: false, motorcycle: false });
  const [breakfastGuests, setBreakfastGuests] = useState(2);
  const [step, setStep] = useState(1);

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
  const wa = ATHA_WHATSAPP;
  const chosen = (rooms || []).filter((r) => picks.includes(r.id));
  const nRooms = chosen.length || count;
  const est = chosen.length ? chosen.reduce((a, r) => a + r.rate * n, 0) : 0;
  const toggle = (id) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setStep(2);
    if (rooms && rooms.length === 0) return setErr('No rooms are free for these dates. Please try other dates or WhatsApp us.');
    setBusy(true);
    if (rooms && nRooms > rooms.length) return setErr(`Only ${rooms.length} room${rooms.length === 1 ? ' is' : 's are'} free for these dates.`);
    const pref = chosen.length ? `Preferred rooms: ${chosen.map((r) => r.name).join(', ')}\n` : '';
    const wants = [
      extras.breakfast ? `Breakfast requested (${breakfastGuests} people per room; price to be confirmed)` : null,
      extras.kitchen ? 'Kitchen use requested (MVR 150; terms to be confirmed)' : null,
      extras.motorcycle ? 'Motorcycle rental requested (MVR 250 / 24 hours; availability to be confirmed)' : null,
    ].filter(Boolean);
    const extraNote = wants.length ? `Additional services:\n${wants.join('\n')}\n` : '';
    const p = { ...f, message: (pref + extraNote + (f.message || '')).slice(0, 1000), rooms: nRooms, check_in: ci, check_out: co };
    const { data: bookingId, error } = await supabase.rpc('request_booking', { p });
    setBusy(false);
    if (error) return setErr(error.message || 'Something went wrong. Please WhatsApp us.');
    // Notifications are best-effort; a failed alert never means the booking failed.
    if (bookingId) fetch('/api/booking-notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, phone: f.phone }),
    }).catch(() => {});
    setDone({ ...p, bookingId, roomName: chosen.length ? `Room ${chosen.map((r) => r.name).join(', ')}` : `${nRooms} room${nRooms > 1 ? 's' : ''}` });
  }

  if (done) {
    const text = `Hello ${name}, I just sent a booking request: ${done.guest}, ${dL(done.check_in)} to ${dL(done.check_out)}, ${done.roomName}, ${done.adults} adult(s).`;
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28 }}>
        <div className="booking-steps"><span className="done">1 · Details</span><span className="done">2 · Request sent</span><span>3 · Confirmation</span></div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Request received!</h1>
        <p>Thank you, {done.guest}. We will confirm your stay from {dL(done.check_in)} to {dL(done.check_out)} by phone or WhatsApp soon.</p>
        <p className="muted">Your booking is pending our review. A request is not yet a confirmed reservation.</p>
        {done.bookingId ? <div className="booking-ref"><span>Booking reference</span><strong>{done.bookingId.slice(0, 8).toUpperCase()}</strong><p className="small muted">Keep your booking reference and the phone number you entered to check progress.</p></div> : null}
        {done.bookingId ? <Link className="btn pri" href={`/track?ref=${encodeURIComponent(done.bookingId)}`}>Track booking progress</Link> : null}
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn coral" href={waLink(wa, text)} target="_blank" rel="noopener">Also message us on WhatsApp</a>
          <a className="btn" href="/">Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="booking-steps" aria-label="Booking steps"><span className={step >= 1 ? 'done' : ''}>1 · Dates & rooms</span><span className={step >= 2 ? 'done' : ''}>2 · Your details</span><span>3 · Confirmation</span></div>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Request your island stay</h1>
      <p className="muted" style={{ marginTop: 0 }}>Choose your dates and how many rooms you need. We confirm every request personally.</p>
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
        <>
          <p className="small muted" style={{ marginTop: 0 }}>{rooms.length} room{rooms.length === 1 ? ' is' : 's are'} free. Tick the rooms you'd like, or just tell us how many you need.</p>
          {!chosen.length ? <label style={{ maxWidth: 220, marginBottom: 10 }}>Number of rooms<input type="number" min="1" max={rooms.length} value={count} onChange={(e) => setCount(Math.max(1, +e.target.value || 1))} /></label> : null}
          <div className="pick">
            {rooms.map((r) => (
              <label key={r.id} className={`opt ${picks.includes(r.id) ? 'on' : ''}`}>
                <input type="checkbox" checked={picks.includes(r.id)} onChange={() => toggle(r.id)} />
                <span style={{ flex: 1 }}><b>{r.type || 'Room'} {r.name}</b><br /><span className="small muted">Up to {r.max_guests} guests</span></span>
                <span className="amt">{cur} {num(r.rate)}<br /><span className="small muted">/ night</span></span>
              </label>
            ))}
          </div>
          {est ? <div className="calcbox">{chosen.length} room{chosen.length > 1 ? 's' : ''} × {n} night{n === 1 ? '' : 's'} ≈ <b>{cur} {num(est)}</b> <span className="small muted">before any taxes</span></div> : null}
        </>
      )}

      <h2 style={{ fontSize: 18, margin: '20px 0 10px' }}>Additional services (optional)</h2>
      <p className="small muted" style={{ marginTop: 0 }}>Tick anything you are interested in. We'll confirm availability and the final charges before adding them to your booking.</p>
      <div className="grid" style={{ gap: 10 }}>
        <label className="check"><input type="checkbox" checked={extras.breakfast} onChange={(e) => setExtras((x) => ({ ...x, breakfast: e.target.checked }))}/> Breakfast — MVR 50 per room for up to 2 people</label>
        {extras.breakfast ? <label style={{ maxWidth: 220 }}>People per room for breakfast<input type="number" min="1" max="30" value={breakfastGuests} onChange={(e) => setBreakfastGuests(Math.max(1, +e.target.value || 1))} /></label> : null}
        {extras.breakfast && breakfastGuests > 2 ? <p className="small muted" style={{ margin: 0 }}>Extra guest surcharge: 35% of MVR 50 (MVR 17.50) per additional person. Breakfast per room: MVR {(50 + (breakfastGuests - 2) * 17.5).toFixed(2)}.</p> : null}
        <label className="check"><input type="checkbox" checked={extras.kitchen} onChange={(e) => setExtras((x) => ({ ...x, kitchen: e.target.checked }))}/> Kitchen use — MVR 150</label>
        <label className="check"><input type="checkbox" checked={extras.motorcycle} onChange={(e) => setExtras((x) => ({ ...x, motorcycle: e.target.checked }))}/> Motorcycle rental — MVR 250 / 24 hours</label>
      </div>

      <h2 style={{ fontSize: 18, margin: '20px 0 10px' }} onMouseEnter={() => setStep(2)}>Your details</h2>
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
