'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStaff } from '@/lib/staffContext';
import { Sheet, Opts, Chip } from '@/components/ui';
import BillPaper from '@/components/BillPaper';
import {
  BST, CAT_IN, CAT_OUT, METH, SRC, addD, billState, calc, conv, dL, dS, lineTot, money, nights, num, paidOf,
  qtyLines, r2, resizeImage, roomState, today, waLink, waNum,
} from '@/lib/util';

const formData = (e) => Object.fromEntries(new FormData(e.currentTarget));

/* ---------- confirm ---------- */
function Confirm({ text, yes, res }) {
  const { close } = useStaff();
  return (
    <Sheet title="Are you sure?" onClose={() => { close(); res(false); }}>
      <p>{text}</p>
      <div className="actions">
        <button className="btn coral" onClick={() => { close(); res(true); }}>{yes}</button>
        <button className="btn" onClick={() => { close(); res(false); }}>Keep</button>
      </div>
    </Sheet>
  );
}

/* ---------- booking list item (used in many places) ---------- */
export function BookingItem({ b, tag }) {
  const { rooms, open } = useStaff();
  const r = rooms.find((x) => x.id === b.room_id);
  const s = BST[b.status] || BST.booked;
  return (
    <button className="item" onClick={() => open('booking', { id: b.id })}>
      <div className="grow">
        <b>{b.guest}</b>
        <span className="small muted">{r ? r.name : 'No room'} · {dS(b.check_in)} → {dS(b.check_out)} · {nights(b.check_in, b.check_out)}n</span>
      </div>
      <span className={`chip ${s[1]}`}>{tag || s[0]}</span>
    </button>
  );
}

export function BillItem({ b }) {
  const { txns, settings, open } = useStaff();
  const c = calc(b, settings);
  return (
    <button className="item" onClick={() => open('bill', { id: b.id })}>
      <div className="grow"><b>{b.customer || '—'}</b><span className="small muted">{b.no} · {dS(b.date)}</span></div>
      <div className="amt">{money(c.total, b.currency)}<br /><Chip s={billState(b, txns, settings)} /></div>
    </button>
  );
}

/* ---------- rooms ---------- */
function RoomSheet({ id }) {
  const { rooms, bookings, run, open, close, isAdmin, settings } = useStaff();
  const r = rooms.find((x) => x.id === id);
  if (!r) return null;
  const s = roomState(r, bookings);
  const fut = bookings.filter((b) => b.room_id === id && b.status === 'booked' && b.check_in >= today()).slice(0, 4);
  const setStatus = async (k) => { if (await run(supabase.from('rooms').update({ status: k }).eq('id', id), 'Room updated')) close(); };
  return (
    <Sheet title={`Room ${r.name}`} onClose={close}>
      <p><span className={`chip s-${s.k}`}>{s.lab}</span> <span className="muted">{r.type} · {money(r.rate, settings.base)}/night</span></p>
      {s.b ? <div className="card" style={{ marginBottom: 10 }}><div className="list"><BookingItem b={s.b} /></div></div> : null}
      <h3 style={{ fontSize: 15, margin: '12px 0 6px' }}>Housekeeping</h3>
      <div className="row">
        {[['ready', 'Ready'], ['cleaning', 'Needs cleaning'], ['maint', 'Maintenance']].map(([k, l]) => (
          <button key={k} className={`btn sm ${r.status === k ? 'pri' : ''}`} onClick={() => setStatus(k)}>{l}</button>
        ))}
      </div>
      {fut.length ? <><h3 style={{ fontSize: 15, margin: '14px 0 6px' }}>Coming up</h3><div className="list">{fut.map((b) => <BookingItem key={b.id} b={b} />)}</div></> : null}
      <div className="actions">
        <button className="btn coral" onClick={() => open('bookingForm', { pre: { room_id: id } })}>+ Book this room</button>
        {isAdmin ? <button className="btn" onClick={() => open('roomForm', { id })}>Edit room</button> : null}
      </div>
    </Sheet>
  );
}

function RoomForm({ id }) {
  const { rooms, run, close, confirm, settings, toast } = useStaff();
  const r = rooms.find((x) => x.id === id) || {};
  const [photo, setPhoto] = useState(r.photo || '');
  const [busy, setBusy] = useState(false);
  async function upload(e) {
    const f = e.target.files[0]; if (!f) return;
    setBusy(true);
    const blob = await resizeImage(f, 1400);
    const path = `rooms/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg' });
    setBusy(false);
    if (error) return toast(error.message);
    setPhoto(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
  }
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    const row = { name: f.name.trim(), type: f.type, rate: +f.rate || 0, max_guests: +f.max_guests || 1, description: f.description, notes: f.notes, sort: +f.sort || 0, is_public: !!f.is_public, photo };
    const q = id ? supabase.from('rooms').update(row).eq('id', id) : supabase.from('rooms').insert(row);
    if (await run(q, 'Room saved')) close();
  }
  async function del() {
    if (!(await confirm('Delete this room? Its old bookings stay but lose their room.'))) return;
    if (await run(supabase.from('rooms').delete().eq('id', id), 'Room deleted')) close();
  }
  return (
    <Sheet title={id ? 'Edit room' : 'Add room'} onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Room name / number<input name="name" required defaultValue={r.name || ''} placeholder="101" /></label>
          <label>Type<input name="type" defaultValue={r.type || ''} placeholder="Double room" /></label>
          <label>Price per night ({settings.base})<input name="rate" type="number" step="0.01" min="0" defaultValue={r.rate ?? ''} /></label>
          <label>Max guests<input name="max_guests" type="number" min="1" defaultValue={r.max_guests || 2} /></label>
          <label>Order on website<input name="sort" type="number" defaultValue={r.sort || 0} /></label>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" name="is_public" defaultChecked={r.is_public ?? true} />Show on website</label>
          <label className="full">Description for guests<textarea name="description" defaultValue={r.description || ''} placeholder="Air-conditioned double room with private bathroom and hot water" /></label>
          <label className="full">Staff notes<textarea name="notes" defaultValue={r.notes || ''} /></label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {photo ? <img src={photo} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10 }} /> : null}
          <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" hidden onChange={upload} /></label>
          {photo ? <button type="button" className="btn sm danger" onClick={() => setPhoto('')}>Remove photo</button> : null}
        </div>
        <div className="actions">
          <button className="btn pri" disabled={busy}>Save room</button>
          {id ? <button type="button" className="btn danger" onClick={del}>Delete</button> : null}
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- bookings ---------- */
function BookingForm({ id, pre = {}, requestId }) {
  const { rooms, bookings, run, close, replace, settings, toast } = useStaff();
  const b = bookings.find((x) => x.id === id) || {};
  const init = { ...b, ...pre };
  const [ci, setCi] = useState(init.check_in || today());
  const [co, setCo] = useState(init.check_out || addD(init.check_in || today(), 1));
  const isFree = (rid, a, z) => !bookings.some((x) => x.id !== id && ['booked', 'in'].includes(x.status) && x.room_id === rid && a < x.check_out && x.check_in < z);
  const firstRoom = init.room_id || (rooms.find((r) => r.status !== 'maint' && isFree(r.id, ci, co)) || rooms[0])?.id || '';
  const [roomId, setRoomId] = useState(firstRoom);
  const [rate, setRate] = useState(init.rate ?? rooms.find((r) => r.id === firstRoom)?.rate ?? 0);
  if (!rooms.length) return <Sheet title="New booking" onClose={close}><p>Add a room first (Rooms tab).</p></Sheet>;
  const n = nights(ci, co);
  const clash = bookings.find((x) => x.id !== id && ['booked', 'in'].includes(x.status) && x.room_id === roomId && ci < x.check_out && x.check_in < co);
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    if (co <= ci) return toast('Check-out must be after check-in');
    const row = {
      guest: f.guest.trim(), phone: f.phone, email: f.email, country: f.country, id_no: f.id_no, room_id: roomId || null,
      check_in: ci, check_out: co, adults: +f.adults || 1, children: +f.children || 0, rate: +rate || 0,
      status: f.status, source: f.source, notes: f.notes,
    };
    let newId = id;
    if (id) {
      if (!(await run(supabase.from('bookings').update(row).eq('id', id), 'Booking saved'))) return;
    } else {
      if (requestId) row.request_id = requestId;
      const d = await run(supabase.from('bookings').insert(row).select('id').single(), 'Booking saved');
      if (!d) return;
      newId = d.id;
      if (requestId) await run(supabase.from('booking_requests').update({ status: 'accepted', booking_id: newId }).eq('id', requestId));
    }
    replace('booking', { id: newId });
  }
  return (
    <Sheet title={id ? 'Edit booking' : 'New booking'} onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Guest name<input name="guest" required defaultValue={init.guest || ''} /></label>
          <label>Phone / WhatsApp<input name="phone" type="tel" defaultValue={init.phone || ''} /></label>
          <label>Email<input name="email" type="email" defaultValue={init.email || ''} /></label>
          <label>Country<input name="country" defaultValue={init.country || ''} /></label>
          <label>Passport / ID no.<input name="id_no" defaultValue={init.id_no || ''} /></label>
          <label>Room<select value={roomId} onChange={(e) => { setRoomId(e.target.value); setRate(rooms.find((r) => r.id === e.target.value)?.rate || 0); }}>
            <Opts list={rooms.map((r) => [r.id, `${r.name}${r.type ? ' · ' + r.type : ''}`])} /></select></label>
          <label>Check-in<input type="date" required value={ci} onChange={(e) => { setCi(e.target.value); if (co <= e.target.value) setCo(addD(e.target.value, 1)); }} /></label>
          <label>Check-out<input type="date" required value={co} onChange={(e) => setCo(e.target.value)} /></label>
          <label>Adults<input name="adults" type="number" min="1" defaultValue={init.adults || 2} /></label>
          <label>Children<input name="children" type="number" min="0" defaultValue={init.children || 0} /></label>
          <label>Price per night ({settings.base})<input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
          <label>Booked via<select name="source" defaultValue={init.source || (requestId ? 'Website' : 'Walk-in')}><Opts list={SRC} /></select></label>
          <label>Status<select name="status" defaultValue={init.status || 'booked'}><Opts list={[['booked', 'Booked'], ['in', 'Checked in'], ['out', 'Checked out'], ['cancel', 'Cancelled']]} /></select></label>
          <label className="full">Notes (flight, transfer, requests)<textarea name="notes" defaultValue={init.notes || ''} /></label>
        </div>
        <p className="muted">{n} night{n === 1 ? '' : 's'} × {money(rate, settings.base)} = <b>{money(n * (+rate || 0), settings.base)}</b></p>
        {clash ? <p className="out">Room already booked by {clash.guest} ({dS(clash.check_in)}–{dS(clash.check_out)}). Choose another room or dates.</p> : null}
        <div className="actions"><button className="btn pri">Save booking</button></div>
      </form>
    </Sheet>
  );
}

function BookingSheet({ id }) {
  const { bookings, rooms, bills, txns, settings, run, open, close, confirm, isAdmin } = useStaff();
  const b = bookings.find((x) => x.id === id);
  if (!b) return null;
  const r = rooms.find((x) => x.id === b.room_id);
  const n = nights(b.check_in, b.check_out);
  const s = BST[b.status] || BST.booked;
  const inv = bills.find((x) => x.kind === 'invoice' && x.booking_id === id);
  const pays = txns.filter((t) => t.type === 'in' && t.booking_id === id);
  const paid = pays.reduce((a, t) => a + conv(t.amount, t.currency, settings.base, settings.fx), 0);
  const charge = n * (+b.rate || 0);
  async function setStatus(k) {
    if (k === 'cancel' && !(await confirm('Cancel this booking?', 'Cancel booking'))) return;
    if (!(await run(supabase.from('bookings').update({ status: k }).eq('id', id), { in: 'Checked in', out: 'Checked out — room set to cleaning', cancel: 'Booking cancelled' }[k]))) return;
    if (k === 'out' && r) await run(supabase.from('rooms').update({ status: 'cleaning' }).eq('id', r.id));
  }
  async function del() {
    if (!(await confirm('Delete this booking for good?'))) return;
    if (await run(supabase.from('bookings').delete().eq('id', id), 'Booking deleted')) close();
  }
  const msg = `Hello ${b.guest}, your booking at ${settings.name} is confirmed: ${r ? 'Room ' + r.name : ''}, ${dL(b.check_in)} to ${dL(b.check_out)} (${n} night${n === 1 ? '' : 's'}). Contact: ${settings.phones}`;
  return (
    <Sheet title={b.guest} onClose={close}>
      <p><Chip s={s} /> <span className="muted">{b.source}</span></p>
      <div className="tot" style={{ maxWidth: 'none' }}>
        <div><span>Room</span><b>{r ? `${r.name}${r.type ? ' · ' + r.type : ''}` : '—'}</b></div>
        <div><span>Stay</span><b>{dL(b.check_in)} → {dL(b.check_out)}</b></div>
        <div><span>Nights · guests</span><b>{n} · {b.adults} adult{b.adults === 1 ? '' : 's'}{b.children ? `, ${b.children} child` : ''}</b></div>
        <div><span>Room charge</span><b>{money(charge, settings.base)}</b></div>
        <div><span>Paid so far</span><b className="in">{money(paid, settings.base)}</b></div>
        {b.phone ? <div><span>Phone</span><b>{b.phone}</b></div> : null}
        {b.country ? <div><span>Country</span><b>{b.country}</b></div> : null}
        {b.id_no ? <div><span>ID</span><b>{b.id_no}</b></div> : null}
      </div>
      {b.notes ? <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{b.notes}</p> : null}
      <div className="actions">
        {b.status === 'booked' ? <button className="btn pri" onClick={() => setStatus('in')}>Check in</button> : null}
        {b.status === 'in' ? <button className="btn pri" onClick={() => setStatus('out')}>Check out</button> : null}
        <button className="btn" onClick={() => open('payment', { link: { booking_id: id }, due: charge - paid, cur: settings.base, note: b.guest })}>Take payment</button>
        <button className="btn" onClick={() => inv ? open('bill', { id: inv.id }) : open('billForm', { fromBooking: id, kind: 'invoice' })}>{inv ? 'Open invoice' : 'Create invoice'}</button>
        <button className="btn" onClick={() => open('billForm', { fromBooking: id, kind: 'quote' })}>Quotation</button>
        {b.phone ? <a className="btn" href={waLink(b.phone, msg)} target="_blank" rel="noopener">WhatsApp</a> : null}
        <button className="btn" onClick={() => open('bookingForm', { id })}>Edit</button>
        {b.status === 'booked' ? <button className="btn danger" onClick={() => setStatus('cancel')}>Cancel booking</button> : null}
        {isAdmin ? <button className="btn danger" onClick={del}>Delete</button> : null}
      </div>
      {pays.length ? <>
        <h3 style={{ fontSize: 15, margin: '16px 0 4px' }}>Payments</h3>
        <div className="list">{pays.map((t) => <div key={t.id} className="item" style={{ cursor: 'default' }}><div className="grow">{dS(t.date)} · {t.method}</div><span className="amt in">{money(t.amount, t.currency)}</span></div>)}</div>
      </> : null}
    </Sheet>
  );
}

/* ---------- payments & money ---------- */
function PaymentForm({ link, due, cur, note }) {
  const { run, close, settings } = useStaff();
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    if (!(+f.amount > 0)) return;
    if (await run(supabase.from('txns').insert({ type: 'in', ...f, amount: +f.amount, ...link }), 'Payment recorded')) close();
  }
  return (
    <Sheet title="Record payment" onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Amount<input name="amount" type="number" step="0.01" min="0.01" required defaultValue={r2(Math.max(0, due || 0)) || ''} /></label>
          <label>Currency<select name="currency" defaultValue={cur || settings.base}><Opts list={['MVR', 'USD']} /></select></label>
          <label>Method<select name="method"><Opts list={METH} /></select></label>
          <label>Date<input name="date" type="date" defaultValue={today()} /></label>
          <label>Category<select name="cat"><Opts list={CAT_IN} /></select></label>
          <label>Note<input name="note" defaultValue={note || ''} /></label>
        </div>
        <div className="actions"><button className="btn pri">Save payment</button></div>
      </form>
    </Sheet>
  );
}

function TxnForm({ id, type }) {
  const { txns, run, close, confirm, settings } = useStaff();
  const x = txns.find((t) => t.id === id) || { type };
  const isIn = x.type === 'in';
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    const row = { type: x.type, ...f, amount: +f.amount };
    const q = id ? supabase.from('txns').update(row).eq('id', id) : supabase.from('txns').insert(row);
    if (await run(q, 'Saved')) close();
  }
  async function del() { if ((await confirm('Delete this entry?')) && (await run(supabase.from('txns').delete().eq('id', id), 'Deleted'))) close(); }
  return (
    <Sheet title={`${id ? 'Edit' : 'Add'} ${isIn ? 'income' : 'expense'}`} onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Amount<input name="amount" type="number" step="0.01" min="0.01" required defaultValue={x.amount || ''} /></label>
          <label>Currency<select name="currency" defaultValue={x.currency || settings.base}><Opts list={['MVR', 'USD']} /></select></label>
          <label>Category<select name="cat" defaultValue={x.cat}><Opts list={isIn ? CAT_IN : CAT_OUT} /></select></label>
          <label>Date<input name="date" type="date" defaultValue={x.date || today()} /></label>
          <label>Method<select name="method" defaultValue={x.method || 'Cash'}><Opts list={METH} /></select></label>
          <label>Note<input name="note" defaultValue={x.note || ''} placeholder={isIn ? 'Guest, room…' : 'Shop, bill no…'} /></label>
        </div>
        {x.bill_id || x.booking_id ? <p className="small muted">Linked to a booking or invoice.</p> : null}
        <div className="actions"><button className="btn pri">Save</button>{id ? <button type="button" className="btn danger" onClick={del}>Delete</button> : null}</div>
      </form>
    </Sheet>
  );
}

/* ---------- bills ---------- */
function billFromBooking(b, r, kind, st) {
  const n = nights(b.check_in, b.check_out);
  return {
    kind, customer: b.guest, phone: b.phone, caddr: '', booking_id: b.id, currency: st.base || 'MVR', date: today(),
    due: kind === 'invoice' ? b.check_out : addD(today(), 7),
    items: [{ d: `Accommodation${r ? ` – Room ${r.name}${r.type ? ` (${r.type})` : ''}` : ''}\n${dL(b.check_in)} – ${dL(b.check_out)}`, q: 1, n, p: +b.rate || 0 }],
    discount: 0, svc_on: +st.service > 0, tgst_on: +st.tgst > 0, green_units: (+b.adults || 1) * n, notes: '',
  };
}

function BillForm({ id, kind, fromBooking }) {
  const { bills, bookings, rooms, settings: st, run, close, replace, toast } = useStaff();
  const start = (() => {
    const ex = bills.find((x) => x.id === id);
    if (ex) return ex;
    const bk = bookings.find((x) => x.id === fromBooking);
    if (bk) return billFromBooking(bk, rooms.find((r) => r.id === bk.room_id), kind, st);
    return { kind, currency: st.base || 'MVR', date: today(), due: addD(today(), kind === 'quote' ? 7 : 0), items: [{ d: kind ? 'Accommodation' : '', q: 1, n: 1, p: 0 }], discount: 0, svc_on: false, tgst_on: false, green_units: 0, notes: '', customer: '', caddr: '', phone: '' };
  })();
  const [b, setB] = useState(start);
  const isQ = b.kind === 'quote';
  const set = (k, v) => setB((x) => ({ ...x, [k]: v }));
  const setItem = (i, k, v) => setB((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const addItem = (d = '', n = 0) => setB((x) => ({ ...x, items: [...x.items, { d, q: 1, n, p: 0 }] }));
  const c = calc(b, st);
  const R = b.rates || st;
  async function save() {
    if (!b.customer?.trim()) return toast('Enter the customer name');
    const items = b.items.filter((i) => String(i.d).trim() || +i.p).map((i) => ({ d: i.d, q: +i.q || 0, n: +i.n || 0, p: +i.p || 0 }));
    if (!items.length) return toast('Add at least one item');
    const row = {
      kind: b.kind, date: b.date, due: b.due || null, customer: b.customer.trim(), caddr: b.caddr, phone: b.phone, booking_id: b.booking_id || null,
      currency: b.currency, items, discount: +b.discount || 0, svc_on: !!b.svc_on, tgst_on: !!b.tgst_on, green_units: +b.green_units || 0, notes: b.notes,
      status: b.status || (isQ ? 'draft' : 'issued'),
    };
    const d = id
      ? await run(supabase.from('bills').update(row).eq('id', id).select('id').single(), 'Saved')
      : await run(supabase.from('bills').insert(row).select('id').single(), 'Saved');
    if (d) replace('bill', { id: d.id });
  }
  return (
    <Sheet title={id ? `Edit ${b.no}` : isQ ? 'New quotation' : 'New invoice'} onClose={close}>
      <div className="fg">
        <label>Customer name<input value={b.customer || ''} onChange={(e) => set('customer', e.target.value)} /></label>
        <label>Phone<input type="tel" value={b.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
        <label>Customer address<input value={b.caddr || ''} onChange={(e) => set('caddr', e.target.value)} placeholder="SH.KANDITHEEMU" /></label>
        <label>Date<input type="date" value={b.date || ''} onChange={(e) => set('date', e.target.value)} /></label>
        <label>{isQ ? 'Valid until' : 'Due date'}<input type="date" value={b.due || ''} onChange={(e) => set('due', e.target.value)} /></label>
        <label>Currency<select value={b.currency} onChange={(e) => set('currency', e.target.value)}><Opts list={['MVR', 'USD']} /></select></label>
        {isQ ? <label>Status<select value={b.status || 'draft'} onChange={(e) => set('status', e.target.value)}><Opts list={[['draft', 'Draft'], ['sent', 'Sent'], ['accepted', 'Accepted'], ['declined', 'Declined']]} /></select></label> : null}
      </div>
      <h3 style={{ fontSize: 15, margin: '16px 0 4px' }}>Items</h3>
      <p className="small muted" style={{ margin: '0 0 8px' }}>For rooms fill Nights (3 rooms × 1 night × rate). Leave Nights empty for other items.</p>
      <div className="items">
        <div className="it small muted"><span>Description</span><span>Qty / rooms</span><span>Nights</span><span>Rate</span><span /></div>
        {b.items.map((it, i) => (
          <div className="it" key={i}>
            <textarea rows={1} style={{ minHeight: 44, padding: 8 }} value={it.d} onChange={(e) => setItem(i, 'd', e.target.value)} aria-label="Description" />
            <input type="number" step="any" min="0" value={it.q} onChange={(e) => setItem(i, 'q', e.target.value)} aria-label="Quantity or rooms" />
            <input type="number" step="any" min="0" value={it.n || ''} placeholder="–" onChange={(e) => setItem(i, 'n', e.target.value)} aria-label="Nights" />
            <input type="number" step="0.01" min="0" value={it.p} onChange={(e) => setItem(i, 'p', e.target.value)} aria-label="Rate" />
            <button type="button" className="btn sm danger" aria-label="Remove line" onClick={() => setB((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}>✕</button>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn sm" onClick={() => addItem()}>+ Add line</button>
        <button type="button" className="btn sm" onClick={() => addItem('Accommodation', 1)}>Accommodation</button>
        {['Airport transfer', 'Meal plan', 'Excursion'].map((d) => <button type="button" key={d} className="btn sm" onClick={() => addItem(d)}>{d}</button>)}
      </div>
      <div className="fg" style={{ marginTop: 14 }}>
        <label>Discount (amount)<input type="number" step="0.01" min="0" value={b.discount} onChange={(e) => set('discount', e.target.value)} /></label>
        <label>Green tax guest-nights<input type="number" min="0" value={b.green_units} onChange={(e) => set('green_units', e.target.value)} /></label>
      </div>
      <div className="row" style={{ marginTop: 10, gap: 18 }}>
        <label className="check"><input type="checkbox" checked={!!b.svc_on} onChange={(e) => set('svc_on', e.target.checked)} />Service charge {R.service}%</label>
        <label className="check"><input type="checkbox" checked={!!b.tgst_on} onChange={(e) => set('tgst_on', e.target.checked)} />T-GST {R.tgst}%</label>
      </div>
      <label style={{ marginTop: 12 }}>Notes / terms<textarea value={b.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
      <div className="tot" style={{ marginTop: 12 }}>
        <div><span>Subtotal</span><span>{money(c.sub, b.currency)}</span></div>
        {c.disc ? <div><span>Discount</span><span>−{money(c.disc, b.currency)}</span></div> : null}
        {c.svc ? <div><span>Service charge</span><span>{money(c.svc, b.currency)}</span></div> : null}
        {c.tg ? <div><span>T-GST</span><span>{money(c.tg, b.currency)}</span></div> : null}
        {c.green ? <div><span>Green tax</span><span>{money(c.green, b.currency)}</span></div> : null}
        <div className="grand"><span>Total</span><span>{money(c.total, b.currency)}</span></div>
      </div>
      <div className="actions"><button className="btn pri" onClick={save}>Save {isQ ? 'quotation' : 'invoice'}</button></div>
    </Sheet>
  );
}

function BillSheet({ id }) {
  const { bills, txns, settings: st, signature, run, open, close, replace, confirm, isAdmin, toast } = useStaff();
  const b = bills.find((x) => x.id === id);
  if (!b) return null;
  const isQ = b.kind === 'quote';
  const c = calc(b, st);
  const s = billState(b, txns, st);
  const paid = isQ ? 0 : paidOf(b, txns, st.fx);
  const text = `${st.name}\n${isQ ? 'Quotation' : 'Invoice'} ${b.no} — ${dL(b.date)}\n${b.customer}\n\n${(b.items || [])
    .map((i) => `• ${String(i.d).replace(/\n/g, ' ')}: ${qtyLines(i, b.currency).join(' @ ')} = ${num(lineTot(i))}`).join('\n')}\n\nTotal: ${money(c.total, b.currency)}${!isQ && paid ? `\nPaid: ${money(paid, b.currency)}\nBalance: ${money(c.total - paid, b.currency)}` : ''}${st.bank ? `\n\n${st.bank}` : ''}\n\nTel: ${st.phones}`;
  async function convert() {
    const { id: _i, no, seq, yr, status, created_at, created_by, rates, ...rest } = b;
    const d = await run(supabase.from('bills').insert({ ...rest, kind: 'invoice', date: today(), due: today(), from_quote: b.no, status: 'issued' }).select('id').single(), 'Invoice created');
    if (!d) return;
    await run(supabase.from('bills').update({ status: 'converted' }).eq('id', id));
    replace('bill', { id: d.id });
  }
  async function del() { if ((await confirm('Delete this bill? Linked payments stay in Money.')) && (await run(supabase.from('bills').delete().eq('id', id), 'Deleted'))) close(); }
  async function copy() { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Could not copy'); } }
  return (
    <Sheet title={`${isQ ? 'Quotation' : 'Invoice'} ${b.no}`} onClose={close}>
      <p><Chip s={s} />{b.from_quote ? <span className="muted small"> from {b.from_quote}</span> : null}</p>
      <div className="paper"><BillPaper bill={b} settings={st} signature={signature} txns={txns} /></div>
      <div className="actions">
        {!isQ && s[0] !== 'Paid' ? <button className="btn pri" onClick={() => open('payment', { link: { bill_id: b.id }, due: c.total - paid, cur: b.currency, note: `${b.no} ${b.customer}` })}>Record payment</button> : null}
        {isQ && b.status !== 'converted' ? <button className="btn pri" onClick={convert}>Turn into invoice</button> : null}
        <a className="btn" href={`/staff/bills/print?id=${b.id}`} target="_blank" rel="noopener">Print / PDF</a>
        <button className="btn" onClick={copy}>Copy text</button>
        {waNum(b.phone) ? <a className="btn" href={waLink(b.phone, text)} target="_blank" rel="noopener">Send on WhatsApp</a> : null}
        <button className="btn" onClick={() => open('billForm', { id: b.id })}>Edit</button>
        {isAdmin ? <button className="btn danger" onClick={del}>Delete</button> : null}
      </div>
    </Sheet>
  );
}

/* ---------- website requests ---------- */
function RequestSheet({ id }) {
  const { requests, rooms, bookings, settings, run, open, close } = useStaff();
  const q = requests.find((x) => x.id === id);
  if (!q) return null;
  const r = rooms.find((x) => x.id === q.room_id);
  const n = nights(q.check_in, q.check_out);
  const free = rooms.filter((rm) => !bookings.some((b) => b.room_id === rm.id && ['booked', 'in'].includes(b.status) && q.check_in < b.check_out && b.check_in < q.check_out));
  const pick = r && free.some((x) => x.id === r.id) ? r : free[0];
  const reply = `Hello ${q.guest}, thank you for your booking request at ${settings.name} for ${dL(q.check_in)} to ${dL(q.check_out)}.`;
  return (
    <Sheet title={`Request · ${q.guest}`} onClose={close}>
      <p><span className={`chip ${q.status === 'new' ? 's-arr' : q.status === 'accepted' ? 's-ready' : 's-maint'}`}>{q.status === 'new' ? 'New' : q.status === 'accepted' ? 'Accepted' : 'Declined'}</span> <span className="muted small">sent {new Date(q.created_at).toLocaleString('en-GB')}</span></p>
      <div className="tot" style={{ maxWidth: 'none' }}>
        <div><span>Stay</span><b>{dL(q.check_in)} → {dL(q.check_out)} ({n}n)</b></div>
        <div><span>Room asked</span><b>{r ? `${r.name} ${r.type || ''}` : 'Any room'}</b></div>
        <div><span>Guests</span><b>{q.adults} adult{q.adults === 1 ? '' : 's'}{q.children ? `, ${q.children} child` : ''}</b></div>
        <div><span>Phone</span><b>{q.phone}</b></div>
        {q.email ? <div><span>Email</span><b>{q.email}</b></div> : null}
        {q.country ? <div><span>Country</span><b>{q.country}</b></div> : null}
        <div><span>Free rooms now</span><b>{free.length ? free.map((x) => x.name).join(', ') : 'None'}</b></div>
      </div>
      {q.message ? <p style={{ whiteSpace: 'pre-wrap' }}>“{q.message}”</p> : null}
      <div className="actions">
        {q.status === 'new' ? <>
          <button className="btn pri" onClick={() => open('bookingForm', { requestId: q.id, pre: { guest: q.guest, phone: q.phone, email: q.email, country: q.country, check_in: q.check_in, check_out: q.check_out, adults: q.adults, children: q.children, notes: q.message, room_id: pick?.id, rate: pick?.rate } })}>Accept → make booking</button>
          <button className="btn danger" onClick={async () => { if (await run(supabase.from('booking_requests').update({ status: 'declined' }).eq('id', id), 'Declined')) close(); }}>Decline</button>
        </> : q.booking_id ? <button className="btn" onClick={() => open('booking', { id: q.booking_id })}>Open booking</button> : null}
        <a className="btn" href={waLink(q.phone, reply)} target="_blank" rel="noopener">WhatsApp guest</a>
      </div>
    </Sheet>
  );
}

/* ---------- staff form ---------- */
function StaffForm({ id, delete: isDel }) {
  const { staff, run, close, confirm, toast } = useStaff();
  const s = staff.find((x) => x.id === id) || {};
  const [photo, setPhoto] = useState(s.photo || '');
  const [busy, setBusy] = useState(false);
  
  async function upload(e) {
    const f = e.target.files[0]; if (!f) return;
    setBusy(true);
    const blob = await resizeImage(f, 800);
    const path = `staff/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg' });
    setBusy(false);
    if (error) return toast(error.message);
    setPhoto(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
  }
  
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    const row = { name: f.name.trim(), role: f.role.trim(), bio: f.bio, sort: +f.sort || 0, is_public: !!f.is_public, photo };
    const q = id ? supabase.from('staff').update(row).eq('id', id) : supabase.from('staff').insert(row);
    if (await run(q, 'Staff member saved')) close();
  }
  
  async function del() {
    if (!(await confirm('Delete this staff member from the directory?'))) return;
    if (await run(supabase.from('staff').delete().eq('id', id), 'Staff member deleted')) close();
  }
  
  if (isDel) {
    return (
      <Sheet title="Delete staff member?" onClose={close}>
        <p>Remove <b>{s.name}</b> from the staff directory?</p>
        <div className="actions">
          <button className="btn danger" onClick={del}>Delete</button>
          <button className="btn" onClick={close}>Keep</button>
        </div>
      </Sheet>
    );
  }
  
  return (
    <Sheet title={id ? `Edit ${s.name}` : 'Add staff member'} onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Name<input name="name" required defaultValue={s.name || ''} placeholder="Ahmed Hassan" /></label>
          <label>Role<input name="role" required defaultValue={s.role || ''} placeholder="Manager" /></label>
          <label>Order on website<input name="sort" type="number" defaultValue={s.sort || 0} /></label>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" name="is_public" defaultChecked={s.is_public ?? true} />Show on website</label>
          <label className="full">Bio<textarea name="bio" defaultValue={s.bio || ''} placeholder="A brief introduction or background..." /></label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {photo ? <img src={photo} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10 }} /> : null}
          <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" hidden onChange={upload} /></label>
          {photo ? <button type="button" className="btn sm danger" onClick={() => setPhoto('')}>Remove photo</button> : null}
        </div>
        <div className="actions">
          <button className="btn pri" disabled={busy}>Save staff member</button>
          {id ? <button type="button" className="btn danger" onClick={del}>Delete</button> : null}
        </div>
      </form>
    </Sheet>
  );
}

export const SHEETS = {
  confirm: Confirm, room: RoomSheet, roomForm: RoomForm, booking: BookingSheet, bookingForm: BookingForm,
  payment: PaymentForm, txnForm: TxnForm, billForm: BillForm, bill: BillSheet, request: RequestSheet, staffForm: StaffForm,
};
