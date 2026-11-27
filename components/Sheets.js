'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStaff } from '@/lib/staffContext';
import { Sheet, Opts, Chip } from '@/components/ui';
import BillPaper, { ReceiptPaper } from '@/components/BillPaper';
import {
  BST, CAT_IN, CAT_OUT, METH, PAY_KINDS, SRC, addD, billState, calc, conv, dL, dS, friendly, gid, groupOf, lineTot, money,
  nights, num, paidOf, qtyLines, r2, resizeImage, roomState, today, waLink, waNum,
} from '@/lib/util';

const formData = (e) => Object.fromEntries(new FormData(e.currentTarget));
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)));

/* ---------- reservation helpers ---------- */
// one entry per reservation (a reservation may hold several rooms)
export function reservations(bookings) {
  const m = new Map();
  bookings.forEach((b) => { const k = gid(b); if (!m.has(k)) m.set(k, { ...b, rows: [] }); m.get(k).rows.push(b); });
  return [...m.values()];
}
export const resRooms = (rows, rooms) => rows.map((x) => rooms.find((r) => r.id === x.room_id)).filter(Boolean);
export function resCharge(rows) {
  return rows.reduce((a, x) => {
    if (x.status === 'cancel') return a;
    const n = nights(x.check_in, x.check_out);
    return a + n * (+x.rate || 0) * (x.room_id ? 1 : +x.rooms_wanted || 1);
  }, 0);
}
export const resPaid = (g, txns, cur, fx) => txns.filter((t) => t.type === 'in' && t.booking_id === g).reduce((a, t) => a + conv(t.amount, t.currency, cur, fx), 0);

function receiptSummary(t, { bills, bookings, txns, rooms, settings }) {
  const inv = t.bill_id ? bills.find((b) => b.id === t.bill_id) : t.booking_id ? bills.find((b) => b.kind === 'invoice' && b.booking_id === t.booking_id) : null;
  if (inv) return { label: `Invoice ${inv.no}`, total: calc(inv, settings).total, received: paidOf(inv, txns, settings.fx), currency: inv.currency };
  if (!t.booking_id) return null;
  const rows = bookings.filter((b) => gid(b) === t.booking_id);
  if (!rows.length) return null;
  const rn = resRooms(rows, rooms).map((r) => r.name).join(', ');
  return {
    label: `Accommodation${rn ? ' – Room ' + rn : ''}\n${dL(rows[0].check_in)} – ${dL(rows[0].check_out)}`,
    total: resCharge(rows), received: resPaid(t.booking_id, txns, settings.base, settings.fx), currency: settings.base,
  };
}

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

/* ---------- list items ---------- */
export function BookingItem({ b, tag }) {
  const { rooms, bookings, open } = useStaff();
  const rows = groupOf(b, bookings);
  const rn = resRooms(rows, rooms).map((r) => r.name);
  const s = BST[b.status] || BST.booked;
  const roomsTxt = rn.length ? `Room${rn.length > 1 ? 's' : ''} ${rn.join(', ')}` : `${b.rooms_wanted || 1} room${(b.rooms_wanted || 1) > 1 ? 's' : ''} wanted`;
  return (
    <button className="item" onClick={() => open('booking', { g: gid(b) })}>
      <div className="grow">
        <b>{b.guest}</b>
        <span className="small muted">{roomsTxt} · {dS(b.check_in)} → {dS(b.check_out)} · {nights(b.check_in, b.check_out)}n</span>
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

export function ReceiptItem({ t }) {
  const { open } = useStaff();
  return (
    <button className="item" onClick={() => open('receipt', { id: t.id })}>
      <div className="grow"><b>{t.payer || t.note || 'Payment'}</b><span className="small muted">{t.receipt_no || 'No receipt no.'} · {dS(t.date)} · {t.pay_kind || 'Payment'} · {t.method}</span></div>
      <span className="amt in">{money(t.amount, t.currency)}</span>
    </button>
  );
}

/* ---------- rooms ---------- */
function RoomSheet({ id }) {
  const { rooms, bookings, run, open, close, settings } = useStaff();
  const r = rooms.find((x) => x.id === id);
  if (!r) return null;
  const s = roomState(r, bookings);
  const fut = bookings.filter((b) => b.room_id === id && b.status === 'booked' && b.check_in > today()).sort((a, b) => a.check_in.localeCompare(b.check_in)).slice(0, 4);
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
      {fut.length ? <><h3 style={{ fontSize: 15, margin: '14px 0 6px' }}>Reserved next</h3><div className="list">{fut.map((b) => <BookingItem key={b.id} b={b} />)}</div></> : null}
      <div className="actions">
        <button className="btn coral" onClick={() => open('bookingForm', { pre: { room_ids: [id] } })}>+ Book this room</button>
        <button className="btn" onClick={() => open('roomForm', { id })}>Edit room</button>
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
    try {
      const blob = await resizeImage(f, 1600);
      const path = `rooms/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      setPhoto(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
    } catch (err) { toast(err.message || 'Upload failed'); }
    setBusy(false);
  }
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    const row = { name: f.name.trim(), type: f.type, rate: +f.rate || 0, max_guests: +f.max_guests || 1, description: f.description, facilities: f.facilities, notes: f.notes, sort: +f.sort || 0, is_public: !!f.is_public, photo };
    const q = id ? supabase.from('rooms').update(row).eq('id', id) : supabase.from('rooms').insert(row);
    if (await run(q, 'Room saved')) close();
  }
  async function del() {
    if (!(await confirm('Delete this room? Old reservations stay but lose their room.'))) return;
    if (await run(supabase.from('rooms').delete().eq('id', id), 'Room deleted')) close();
  }
  return (
    <Sheet title={id ? `Edit room ${r.name}` : 'Add room'} onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Room name / number<input name="name" required defaultValue={r.name || ''} placeholder="101" /></label>
          <label>Type<input name="type" defaultValue={r.type || ''} placeholder="Double room" /></label>
          <label>Price per night ({settings.base})<input name="rate" type="number" step="0.01" min="0" defaultValue={r.rate ?? ''} /></label>
          <label>Max guests<input name="max_guests" type="number" min="1" defaultValue={r.max_guests || 2} /></label>
          <label>Order on website<input name="sort" type="number" defaultValue={r.sort || 0} /></label>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" name="is_public" defaultChecked={r.is_public ?? true} />Published on website</label>
          <label className="full">Facilities (comma separated)<input name="facilities" defaultValue={r.facilities || ''} placeholder="Air conditioning, Hot water, Wi-Fi, Private bathroom" /></label>
          <label className="full">Description for guests<textarea name="description" defaultValue={r.description || ''} /></label>
          <label className="full">Notes for admins (not shown to guests)<textarea name="notes" defaultValue={r.notes || ''} /></label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {photo ? <img src={photo} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10 }} /> : null}
          <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy ? 'Uploading…' : photo ? 'Change main photo' : 'Add main photo'}<input type="file" accept="image/*" hidden onChange={upload} /></label>
          {photo ? <button type="button" className="btn sm danger" onClick={() => setPhoto('')}>Remove photo</button> : null}
        </div>
        <p className="small muted">More photos and videos for this room: Website & Gallery → Gallery.</p>
        <div className="actions">
          <button className="btn pri" disabled={busy}>Save room</button>
          {id ? <button type="button" className="btn danger" onClick={del}>Delete room</button> : null}
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- reservations ---------- */
function BookingForm({ g, pre = {}, confirmMode }) {
  const { rooms, bookings, settings, reload, toast, replace, close } = useStaff();
  const rows = g ? bookings.filter((x) => gid(x) === g) : [];
  const init = { ...(rows[0] || {}), ...pre };
  const [ci, setCi] = useState(init.check_in || today());
  const [co, setCo] = useState(init.check_out || addD(init.check_in || today(), 1));
  const [status, setStatus] = useState(confirmMode ? 'booked' : init.status || 'booked');
  const isFree = (rid, a, z) => !bookings.some((x) => gid(x) !== g && ['booked', 'in'].includes(x.status) && x.room_id === rid && a < x.check_out && x.check_in < z);
  const initSel = rows.filter((x) => x.room_id).map((x) => x.room_id);
  const [sel, setSel] = useState(() => {
    if (pre.room_ids) return pre.room_ids;
    if (initSel.length) return initSel;
    if (g) { // confirming a request: suggest free rooms
      const want = init.rooms_wanted || 1;
      return rooms.filter((r) => r.status !== 'maint' && isFree(r.id, ci, co)).slice(0, want).map((r) => r.id);
    }
    const f = rooms.find((r) => r.status !== 'maint' && isFree(r.id, ci, co));
    return f ? [f.id] : [];
  });
  const [rate, setRate] = useState(init.rate || rooms.find((r) => r.id === sel[0])?.rate || 0);
  const [busy, setBusy] = useState(false);
  if (!rooms.length) return <Sheet title="New reservation" onClose={close}><p>Add rooms first: Website & Gallery → Rooms.</p></Sheet>;
  const n = nights(ci, co);
  const count = sel.length || (status === 'request' ? +init.rooms_wanted || 1 : 0);
  const busyRooms = sel.filter((rid) => !isFree(rid, ci, co));
  const toggle = (rid) => {
    if (!sel.length && !+rate) setRate(rooms.find((r) => r.id === rid)?.rate || 0);
    setSel(sel.includes(rid) ? sel.filter((x) => x !== rid) : [...sel, rid]);
  };

  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    if (co <= ci) return toast('Check-out must be after check-in');
    if (!['request', 'cancel'].includes(status) && !sel.length) return toast('Choose at least one room');
    if (['booked', 'in'].includes(status) && busyRooms.length) return toast('Some chosen rooms are already booked for these dates');
    setBusy(true);
    const G = g || newId();
    const common = {
      guest: f.guest.trim(), phone: f.phone, email: f.email, country: f.country, id_no: f.id_no, check_in: ci, check_out: co,
      adults: +f.adults || 1, children: +f.children || 0, rate: +rate || 0, status, source: f.source, notes: f.notes,
      rooms_wanted: sel.length || Math.max(1, +f.rooms_wanted || 1), group_id: G,
    };
    const ops = [];
    if (!sel.length) {
      if (rows.length) {
        rows.slice(1).forEach((x) => ops.push(() => supabase.from('bookings').delete().eq('id', x.id)));
        ops.push(() => supabase.from('bookings').update({ ...common, room_id: null }).eq('id', rows[0].id));
      } else ops.push(() => supabase.from('bookings').insert({ ...common, room_id: null }));
    } else {
      const keep = rows.filter((x) => x.room_id && sel.includes(x.room_id));
      const spare = rows.filter((x) => !keep.includes(x));
      const add = sel.filter((rid) => !keep.some((k) => k.room_id === rid));
      const reuse = spare.slice(0, add.length);
      spare.slice(add.length).forEach((x) => ops.push(() => supabase.from('bookings').delete().eq('id', x.id)));
      // free up reused rows first so rooms can move between them
      reuse.forEach((x) => ops.push(() => supabase.from('bookings').update({ status: 'cancel', room_id: null }).eq('id', x.id)));
      keep.forEach((x) => ops.push(() => supabase.from('bookings').update({ ...common, room_id: x.room_id }).eq('id', x.id)));
      reuse.forEach((x, i) => ops.push(() => supabase.from('bookings').update({ ...common, room_id: add[i] }).eq('id', x.id)));
      add.slice(reuse.length).forEach((rid) => ops.push(() => supabase.from('bookings').insert({ ...common, room_id: rid })));
    }
    let err = null;
    for (const op of ops) { const { error } = await op(); if (error) { err = error; break; } }
    await reload();
    setBusy(false);
    if (err) return toast(friendly(err));
    toast(confirmMode ? 'Reservation confirmed' : 'Reservation saved');
    replace('booking', { g: G });
  }

  return (
    <Sheet title={confirmMode ? 'Confirm request & assign rooms' : g ? 'Edit reservation' : 'New reservation'} onClose={close}>
      <form onSubmit={save}>
        <div className="fg">
          <label>Guest name<input name="guest" required defaultValue={init.guest || ''} /></label>
          <label>Phone / WhatsApp<input name="phone" type="tel" defaultValue={init.phone || ''} /></label>
          <label>Email<input name="email" type="email" defaultValue={init.email || ''} /></label>
          <label>Country<input name="country" defaultValue={init.country || ''} /></label>
          <label>Passport / ID no.<input name="id_no" defaultValue={init.id_no || ''} /></label>
          <label>Booked via<select name="source" defaultValue={init.source || 'Walk-in'}><Opts list={SRC} /></select></label>
          <label>Arrival (check-in)<input type="date" required value={ci} onChange={(e) => { setCi(e.target.value); if (co <= e.target.value) setCo(addD(e.target.value, 1)); }} /></label>
          <label>Departure (check-out)<input type="date" required value={co} onChange={(e) => setCo(e.target.value)} /></label>
          <label>Adults<input name="adults" type="number" min="1" defaultValue={init.adults || 2} /></label>
          <label>Children<input name="children" type="number" min="0" defaultValue={init.children || 0} /></label>
          <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>
            <Opts list={[['request', 'New request'], ['booked', 'Confirmed'], ['in', 'Checked in'], ['out', 'Checked out'], ['cancel', 'Cancelled']]} /></select></label>
          <label>Price per room / night ({settings.base})<input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
          {status === 'request' && !sel.length ? <label>Rooms wanted<input name="rooms_wanted" type="number" min="1" defaultValue={init.rooms_wanted || 1} /></label> : null}
        </div>
        <h3 style={{ fontSize: 15, margin: '16px 0 6px' }}>Rooms {sel.length ? `(${sel.length} chosen)` : ''}</h3>
        <div className="roompick">
          {rooms.map((r) => {
            const free = isFree(r.id, ci, co);
            const on = sel.includes(r.id);
            return (
              <label key={r.id} className={`rp ${on ? 'on' : ''} ${free ? '' : 'busy'}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(r.id)} disabled={!free && !on} />
                <b>{r.name}</b><span className="small">{free ? (r.status === 'maint' ? 'Maintenance' : r.type || 'Free') : 'Booked'}</span>
              </label>
            );
          })}
        </div>
        <div className="calcbox">
          {count} room{count === 1 ? '' : 's'} × {n} night{n === 1 ? '' : 's'} × {money(rate, settings.base)} = <b>{money(count * n * (+rate || 0), settings.base)}</b>
        </div>
        {busyRooms.length ? <p className="out">Already booked for these dates: {busyRooms.map((rid) => rooms.find((r) => r.id === rid)?.name).join(', ')}</p> : null}
        <label style={{ marginTop: 12 }}>Notes (flight, transfer, requests)<textarea name="notes" defaultValue={init.notes || ''} /></label>
        <div className="actions"><button className="btn pri" disabled={busy}>{busy ? 'Saving…' : confirmMode ? 'Confirm reservation' : 'Save reservation'}</button></div>
      </form>
    </Sheet>
  );
}

function BookingSheet({ g, id }) {
  const { bookings, rooms, bills, txns, settings, run, open, close, confirm } = useStaff();
  const G = g || gid(bookings.find((x) => x.id === id) || {});
  const rows = bookings.filter((x) => gid(x) === G);
  if (!rows.length) return null;
  const b = rows[0];
  const rr = resRooms(rows, rooms);
  const n = nights(b.check_in, b.check_out);
  const s = BST[b.status] || BST.booked;
  const inv = bills.find((x) => x.kind === 'invoice' && x.booking_id === G);
  const pays = txns.filter((t) => t.type === 'in' && t.booking_id === G);
  const charge = resCharge(rows);
  const total = inv ? conv(calc(inv, settings).total, inv.currency, settings.base, settings.fx) : charge;
  const paid = inv ? conv(paidOf(inv, txns, settings.fx), inv.currency, settings.base, settings.fx) : resPaid(G, txns, settings.base, settings.fx);
  async function setStatus(k) {
    if (k === 'cancel' && !(await confirm('Cancel this reservation?', 'Cancel reservation'))) return;
    const msg = { in: 'Checked in', out: 'Checked out — rooms set to cleaning', cancel: 'Reservation cancelled' }[k];
    if (!(await run(supabase.from('bookings').update({ status: k }).eq('group_id', G), msg))) return;
    if (k === 'out' && rr.length) await run(supabase.from('rooms').update({ status: 'cleaning' }).in('id', rr.map((r) => r.id)));
  }
  async function del() {
    if (!(await confirm('Delete this reservation for good? Payments stay in Finance.'))) return;
    if (await run(supabase.from('bookings').delete().eq('group_id', G), 'Reservation deleted')) close();
  }
  const roomsTxt = rr.length ? rr.map((r) => r.name).join(', ') : `${b.rooms_wanted || 1} wanted — not assigned yet`;
  const waMsg = b.status === 'request'
    ? `Hello ${b.guest}, thank you for your booking request at ${settings.name} for ${dL(b.check_in)} to ${dL(b.check_out)}.`
    : `Hello ${b.guest}, your reservation at ${settings.name} is confirmed: ${rr.length} room${rr.length === 1 ? '' : 's'} (${rr.map((r) => r.name).join(', ')}), ${dL(b.check_in)} to ${dL(b.check_out)} (${n} night${n === 1 ? '' : 's'}). Contact: ${settings.phones}`;
  return (
    <Sheet title={b.guest} onClose={close}>
      <div className="flow">
        {['request', 'booked', 'in', 'out'].map((k) => <span key={k} className={b.status === k ? 'on' : ''}>{BST[k][0]}</span>)}
      </div>
      {b.status === 'cancel' ? <p><Chip s={s} /></p> : null}
      <div className="tot" style={{ maxWidth: 'none' }}>
        <div><span>Rooms</span><b>{roomsTxt}</b></div>
        <div><span>Stay</span><b>{dL(b.check_in)} → {dL(b.check_out)}</b></div>
        <div><span>Nights · guests</span><b>{n} · {b.adults} adult{b.adults === 1 ? '' : 's'}{b.children ? `, ${b.children} child` : ''}</b></div>
        <div><span>Accommodation</span><b>{(rr.length || b.rooms_wanted || 1)} × {n} × {money(b.rate, settings.base)} = {money(charge, settings.base)}</b></div>
        {inv ? <div><span>Invoice {inv.no}</span><b>{money(total, settings.base)}</b></div> : null}
        <div><span>Received (deposits & payments)</span><b className="in">{money(paid, settings.base)}</b></div>
        <div className="grand"><span>Remaining balance</span><span>{money(Math.max(0, total - paid), settings.base)}</span></div>
        {b.phone ? <div><span>Phone</span><b>{b.phone}</b></div> : null}
        {b.email ? <div><span>Email</span><b>{b.email}</b></div> : null}
        {b.country ? <div><span>Country</span><b>{b.country}</b></div> : null}
        {b.id_no ? <div><span>ID</span><b>{b.id_no}</b></div> : null}
        <div><span>Booked via</span><b>{b.source}</b></div>
      </div>
      {b.notes ? <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{b.notes}</p> : null}
      <div className="actions">
        {b.status === 'request' ? <button className="btn pri" onClick={() => open('bookingForm', { g: G, confirmMode: true })}>Confirm & assign rooms</button> : null}
        {b.status === 'booked' ? <button className="btn pri" onClick={() => setStatus('in')}>Check in</button> : null}
        {b.status === 'in' ? <button className="btn pri" onClick={() => setStatus('out')}>Check out</button> : null}
        <button className="btn" onClick={() => open('payment', { link: { booking_id: G }, due: total - paid, cur: settings.base, payer: b.guest, kind: paid ? 'Balance payment' : 'Deposit' })}>Record payment</button>
        <button className="btn" onClick={() => (inv ? open('bill', { id: inv.id }) : open('billForm', { fromGroup: G, kind: 'invoice' }))}>{inv ? 'Open invoice' : 'Create invoice'}</button>
        <button className="btn" onClick={() => open('billForm', { fromGroup: G, kind: 'quote' })}>Quotation</button>
        {waNum(b.phone) ? <a className="btn" href={waLink(b.phone, waMsg)} target="_blank" rel="noopener">WhatsApp</a> : null}
        <button className="btn" onClick={() => open('bookingForm', { g: G })}>Edit</button>
        {['request', 'booked'].includes(b.status) ? <button className="btn danger" onClick={() => setStatus('cancel')}>Cancel</button> : null}
        <button className="btn danger" onClick={del}>Delete</button>
      </div>
      {pays.length ? <>
        <h3 style={{ fontSize: 15, margin: '16px 0 4px' }}>Receipts</h3>
        <div className="list">{pays.map((t) => <ReceiptItem key={t.id} t={t} />)}</div>
      </> : null}
    </Sheet>
  );
}

/* ---------- payments, receipts & money ---------- */
function PaymentForm({ link, due, cur, payer, kind }) {
  const { reload, toast, replace, close, settings } = useStaff();
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    const f = formData(e);
    if (!(+f.amount > 0)) return toast('Enter an amount');
    setBusy(true);
    const { data, error } = await supabase.from('txns').insert({ type: 'in', ...f, amount: +f.amount, ...link }).select('id').single();
    await reload();
    setBusy(false);
    if (error) return toast(friendly(error));
    toast('Payment recorded');
    replace('receipt', { id: data.id });
  }
  return (
    <Sheet title="Record payment" onClose={close}>
      <form onSubmit={save}>
        {due > 0 ? <p className="muted">Remaining balance: <b>{money(due, cur || settings.base)}</b></p> : null}
        <div className="fg">
          <label>Amount received<input name="amount" type="number" step="0.01" min="0.01" required defaultValue={kind === 'Deposit' ? '' : r2(Math.max(0, due || 0)) || ''} /></label>
          <label>Currency<select name="currency" defaultValue={cur || settings.base}><Opts list={['MVR', 'USD']} /></select></label>
          <label>Type<select name="pay_kind" defaultValue={kind || 'Deposit'}><Opts list={PAY_KINDS} /></select></label>
          <label>Method<select name="method"><Opts list={METH} /></select></label>
          <label>Date<input name="date" type="date" defaultValue={today()} /></label>
          <label>Received from<input name="payer" defaultValue={payer || ''} /></label>
          <label>Category<select name="cat"><Opts list={CAT_IN} /></select></label>
          <label>Note<input name="note" placeholder="Bank ref, slip no…" /></label>
        </div>
        <div className="actions"><button className="btn pri" disabled={busy}>{busy ? 'Saving…' : 'Save & make receipt'}</button></div>
      </form>
    </Sheet>
  );
}

function ReceiptSheet({ id }) {
  const all = useStaff();
  const { txns, settings, signature, run, close, confirm, toast } = all;
  const t = txns.find((x) => x.id === id);
  if (!t) return null;
  const sum = receiptSummary(t, all);
  const text = `${settings.name}\nReceipt ${t.receipt_no || ''} — ${dL(t.date)}\nReceived from: ${t.payer || ''}\n${t.pay_kind || 'Payment'}: ${money(t.amount, t.currency)} (${t.method})${sum ? `\n${sum.label.replace(/\n/g, ' ')}\nTotal: ${money(sum.total, sum.currency)}\nReceived to date: ${money(sum.received, sum.currency)}\nRemaining balance: ${money(Math.max(0, sum.total - sum.received), sum.currency)}` : ''}\n\nThank you. Tel: ${settings.phones}`;
  const phone = all.bookings.find((b) => gid(b) === t.booking_id)?.phone || all.bills.find((b) => b.id === t.bill_id)?.phone;
  async function del() { if ((await confirm('Delete this payment and its receipt?')) && (await run(supabase.from('txns').delete().eq('id', id), 'Deleted'))) close(); }
  async function copy() { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Could not copy'); } }
  return (
    <Sheet title={`Receipt ${t.receipt_no || ''}`} onClose={close}>
      <div className="paper"><ReceiptPaper txn={t} settings={settings} signature={signature} summary={sum} /></div>
      <div className="actions">
        <a className="btn pri" href={`/staff/billing/print?receipt=${t.id}`} target="_blank" rel="noopener">Print / PDF</a>
        {waNum(phone) ? <a className="btn" href={waLink(phone, text)} target="_blank" rel="noopener">Send on WhatsApp</a> : null}
        <button className="btn" onClick={copy}>Copy text</button>
        <button className="btn danger" onClick={del}>Delete</button>
      </div>
    </Sheet>
  );
}

function TxnForm({ id, type }) {
  const { txns, run, close, confirm, settings, open } = useStaff();
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
          <label>{isIn ? 'Received from' : 'Paid to'}<input name="payer" defaultValue={x.payer || ''} /></label>
          <label className="full">Note<input name="note" defaultValue={x.note || ''} placeholder={isIn ? 'What it was for' : 'Shop, bill no…'} /></label>
        </div>
        {x.receipt_no ? <p className="small muted">Guest payment · receipt {x.receipt_no} · <button type="button" className="btn sm" onClick={() => open('receipt', { id })}>View receipt</button></p> : null}
        <div className="actions"><button className="btn pri">Save</button>{id ? <button type="button" className="btn danger" onClick={del}>Delete</button> : null}</div>
      </form>
    </Sheet>
  );
}

/* ---------- quotations & invoices ---------- */
function billFromGroup(rows, rooms, kind, st) {
  const b = rows[0];
  const n = nights(b.check_in, b.check_out);
  const byRate = {};
  rows.filter((x) => x.status !== 'cancel').forEach((x) => { const k = String(+x.rate || 0); (byRate[k] = byRate[k] || []).push(x); });
  const items = Object.entries(byRate).map(([rate, xs]) => {
    const rr = resRooms(xs, rooms);
    const label = rr.length ? ` – Room${rr.length > 1 ? 's' : ''} ${rr.map((r) => r.name).join(', ')}` : '';
    return { d: `Accommodation${label}\n${dL(b.check_in)} – ${dL(b.check_out)}`, q: rr.length || +b.rooms_wanted || 1, n, p: +rate };
  });
  return {
    kind, customer: b.guest, phone: b.phone, caddr: '', booking_id: gid(b), currency: st.base || 'MVR', date: today(),
    due: kind === 'invoice' ? b.check_out : addD(today(), 7), items: items.length ? items : [{ d: 'Accommodation', q: 1, n, p: 0 }],
    discount: 0, svc_on: false, tgst_on: false, green_units: 0, notes: '',
  };
}

function BillForm({ id, kind, fromGroup }) {
  const { bills, bookings, rooms, settings: st, run, close, replace, toast } = useStaff();
  const start = (() => {
    const ex = bills.find((x) => x.id === id);
    if (ex) return ex;
    const rows = bookings.filter((x) => gid(x) === fromGroup);
    if (rows.length) return billFromGroup(rows, rooms, kind, st);
    return { kind, currency: st.base || 'MVR', date: today(), due: addD(today(), kind === 'quote' ? 7 : 0), items: [{ d: 'Accommodation', q: 1, n: 1, p: 0 }], discount: 0, svc_on: false, tgst_on: false, green_units: 0, notes: '', customer: '', caddr: '', phone: '' };
  })();
  const [b, setB] = useState(start);
  const isQ = b.kind === 'quote';
  const set = (k, v) => setB((x) => ({ ...x, [k]: v }));
  const setItem = (i, k, v) => setB((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const addItem = (d = '', n = 0) => setB((x) => ({ ...x, items: [...x.items, { d, q: 1, n, p: 0 }] }));
  const [breakfastGuests, setBreakfastGuests] = useState(2);
  const [breakfastRooms, setBreakfastRooms] = useState(1);
  const [breakfastDays, setBreakfastDays] = useState(1);
  const breakfastRate = Math.round((50 * (1 + Math.max(0, breakfastGuests - 2) * 0.35)) * 100) / 100;
  const serviceRate = (amount) => b.currency === 'USD' ? r2(amount / (+st.fx || 15.42)) : amount;
  const addBreakfast = () => setB((x) => ({
    ...x,
    items: [...x.items, {
      d: `Breakfast — ${breakfastGuests} guest(s) per room`,
      q: Math.max(1, +breakfastRooms || 1), n: Math.max(1, +breakfastDays || 1),
      p: serviceRate(breakfastRate),
    }],
  }));
  const addKitchen = () => setB((x) => ({ ...x, items: [...x.items, { d: 'Kitchen use', q: 1, n: 0, p: serviceRate(150) }] }));
  const addMotorcycle = () => setB((x) => ({ ...x, items: [...x.items, { d: 'Motorcycle rental (24 hours)', q: 1, n: 0, p: serviceRate(250) }] }));
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
      <p className="small muted" style={{ margin: '0 0 8px' }}>Rooms: fill Rooms, Nights and Rate (5 rooms × 11 nights × 470). Extra charges: leave Nights empty.</p>
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
        <button type="button" className="btn sm" onClick={() => addItem()}>+ Extra charge</button>
        <button type="button" className="btn sm" onClick={() => addItem('Accommodation', 1)}>+ Rooms</button>
        <button type="button" className="btn sm" onClick={addKitchen}>+ Kitchen use · MVR 150</button>
        <button type="button" className="btn sm" onClick={addMotorcycle}>+ Motorcycle · MVR 250 / 24h</button>
        {['Airport transfer', 'Meals', 'Excursion', 'Laundry'].map((d) => <button type="button" key={d} className="btn sm" onClick={() => addItem(d)}>{d}</button>)}
      </div>
      <div className="card" style={{ marginTop: 12, background: 'var(--soft)' }}>
        <h3 style={{ fontSize: 15, marginBottom: 5 }}>Add breakfast</h3>
        <p className="small muted" style={{ marginTop: 0 }}>MVR 50 per room for up to 2 guests. Each additional guest adds 35% of the base rate (MVR 17.50). Set rooms and breakfast days below.</p>
        <div className="fg">
          <label>People per room<input type="number" min="1" max="30" value={breakfastGuests} onChange={(e) => setBreakfastGuests(Math.max(1, +e.target.value || 1))}/></label>
          <label>Rooms<input type="number" min="1" max="60" value={breakfastRooms} onChange={(e) => setBreakfastRooms(Math.max(1, +e.target.value || 1))}/></label>
          <label>Breakfast days<input type="number" min="1" max="365" value={breakfastDays} onChange={(e) => setBreakfastDays(Math.max(1, +e.target.value || 1))}/></label>
        </div>
        <p style={{ margin: '8px 0' }}><b>{money(serviceRate(breakfastRate * breakfastRooms * breakfastDays), b.currency)}</b> total for breakfast</p>
        <button type="button" className="btn sm pri" onClick={addBreakfast}>+ Add breakfast to bill</button>
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
  const { bills, txns, settings: st, signature, run, open, close, replace, confirm, toast } = useStaff();
  const b = bills.find((x) => x.id === id);
  if (!b) return null;
  const isQ = b.kind === 'quote';
  const c = calc(b, st);
  const s = billState(b, txns, st);
  const paid = isQ ? 0 : paidOf(b, txns, st.fx);
  const pays = isQ ? [] : txns.filter((t) => t.type === 'in' && (t.bill_id === b.id || (b.booking_id && t.booking_id === b.booking_id)));
  const text = `${st.name}\n${isQ ? 'Quotation' : 'Invoice'} ${b.no} — ${dL(b.date)}\n${b.customer}\n\n${(b.items || [])
    .map((i) => `• ${String(i.d).replace(/\n/g, ' ')}: ${qtyLines(i, b.currency).join(' @ ')} = ${num(lineTot(i))}`).join('\n')}\n\nTotal: ${money(c.total, b.currency)}${!isQ && paid ? `\nReceived: ${money(paid, b.currency)}\nRemaining balance: ${money(c.total - paid, b.currency)}` : ''}${st.bank ? `\n\n${st.bank}` : ''}\n\nTel: ${st.phones}`;
  async function convert() {
    const { id: _i, no, seq, yr, status, created_at, created_by, rates, ...rest } = b;
    const d = await run(supabase.from('bills').insert({ ...rest, kind: 'invoice', date: today(), due: today(), from_quote: b.no, status: 'issued' }).select('id').single(), 'Invoice created');
    if (!d) return;
    await run(supabase.from('bills').update({ status: 'converted' }).eq('id', id));
    replace('bill', { id: d.id });
  }
  async function del() { if ((await confirm('Delete this document? Payments stay in Finance.')) && (await run(supabase.from('bills').delete().eq('id', id), 'Deleted'))) close(); }
  async function copy() { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Could not copy'); } }
  return (
    <Sheet title={`${isQ ? 'Quotation' : 'Invoice'} ${b.no}`} onClose={close}>
      <p><Chip s={s} />{b.from_quote ? <span className="muted small"> from {b.from_quote}</span> : null}
        {!isQ ? <span className="muted small"> · balance {money(Math.max(0, c.total - paid), b.currency)}</span> : null}</p>
      <div className="paper"><BillPaper bill={b} settings={st} signature={signature} txns={txns} /></div>
      <div className="actions">
        {!isQ && s[0] !== 'Paid' ? <button className="btn pri" onClick={() => open('payment', { link: b.booking_id ? { booking_id: b.booking_id } : { bill_id: b.id }, due: c.total - paid, cur: b.currency, payer: b.customer, kind: paid ? 'Balance payment' : 'Deposit' })}>Record payment</button> : null}
        {isQ && b.status !== 'converted' ? <button className="btn pri" onClick={convert}>Turn into invoice</button> : null}
        <a className="btn" href={`/staff/billing/print?id=${b.id}`} target="_blank" rel="noopener">Print / PDF</a>
        {waNum(b.phone) ? <a className="btn" href={waLink(b.phone, text)} target="_blank" rel="noopener">Send on WhatsApp</a> : null}
        <button className="btn" onClick={copy}>Copy text</button>
        <button className="btn" onClick={() => open('billForm', { id: b.id })}>Edit</button>
        <button className="btn danger" onClick={del}>Delete</button>
      </div>
      {pays.length ? <><h3 style={{ fontSize: 15, margin: '16px 0 4px' }}>Receipts</h3><div className="list">{pays.map((t) => <ReceiptItem key={t.id} t={t} />)}</div></> : null}
    </Sheet>
  );
}

export const SHEETS = {
  confirm: Confirm, room: RoomSheet, roomForm: RoomForm, booking: BookingSheet, bookingForm: BookingForm,
  payment: PaymentForm, receipt: ReceiptSheet, txnForm: TxnForm, billForm: BillForm, bill: BillSheet,
};
