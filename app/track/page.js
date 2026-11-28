'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/PublicNav';
import { ATHA_WHATSAPP, waLink } from '@/lib/util';

const STEPS = [
  { key: 'request', label: 'Request received', detail: 'Your request has reached ATHA INN.' },
  { key: 'booked', label: 'Reservation confirmed', detail: 'Our team has confirmed your accommodation.' },
  { key: 'in', label: 'Checked in', detail: 'Welcome to Kanditheemu!' },
  { key: 'out', label: 'Stay completed', detail: 'Thank you for staying with us.' },
];
function Tracker() {
  const params = useSearchParams();
  const [ref, setRef] = useState(params.get('ref') || '');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function check(e) {
    e.preventDefault(); setBusy(true); setError(''); setStatus(null);
    const { data, error: err } = await supabase.rpc('track_booking', { booking_id: ref.trim(), guest_phone: phone.trim() });
    setBusy(false);
    if (err || !data || !(Array.isArray(data) ? data.length : Object.keys(data).length)) return setError('We could not find a request with that booking reference and phone number. Check both details or contact ATHA INN.');
    setStatus(Array.isArray(data) ? data[0] : data);
  }
  const current = STEPS.findIndex((x) => x.key === status?.status);
  const cancelled = status?.status === 'cancel';
  return <main className="book-wrap">
    <div className="track-hero"><span className="eyebrow">YOUR STAY, MADE SIMPLE</span><h1>Track your reservation</h1><p>See the latest booking status with your reference and the phone number used to book.</p></div>
    <form className="card track-form" onSubmit={check}>
      <div className="fg"><label>Booking reference<input required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Paste your full booking reference" /></label>
      <label>Booking phone number<input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+960 ..." /></label></div>
      <div className="actions"><button disabled={busy} className="btn pri">{busy ? 'Checking…' : 'Check progress'}</button><Link className="btn" href="/book">New booking</Link></div>
      {error ? <p role="alert" className="out">{error}</p> : null}
    </form>
    {status ? <div className="card track-result" aria-live="polite">
      <div className="row between"><h2>Booking progress</h2><span className="chip s-conf">{cancelled ? 'Cancelled' : STEPS[Math.max(current,0)].label}</span></div>
      {cancelled ? <p>Your booking was cancelled. Contact our team if you need help or want to make a new request.</p> :
      <ol className="progress-timeline">{STEPS.map((s,i) => <li key={s.key} className={i <= current ? 'complete' : ''}>
        <div className="progress-dot">{i < current ? '✓' : i+1}</div><div><strong>{s.label}</strong><p>{s.detail}</p></div>
      </li>)}</ol>}
      <p className="small muted">Status is updated when ATHA INN staff process your reservation. Please keep your booking reference private.</p>
      <a className="btn" href={waLink(ATHA_WHATSAPP, 'Hello ATHA INN, I would like an update on my booking.')} target="_blank" rel="noopener noreferrer">Contact us on WhatsApp</a>
    </div> : null}
  </main>;
}
export default function TrackPage() {return <><PublicNav info={null}/><Suspense fallback={<div className="empty">Loading…</div>}><Tracker/></Suspense></>;}
