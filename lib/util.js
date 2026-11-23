export const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const today = () => iso(new Date());
export const addD = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const nights = (a, b) => (a && b ? Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 864e5)) : 0);
export const r2 = (n) => Math.round((+n || 0) * 100) / 100;
export const num = (n) => (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n, c = 'MVR') => `${c} ${num(n)}`;
export const dS = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
export const dL = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const dN = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
export const waNum = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 7) d = '960' + d; return d; };
export const waLink = (p, text) => `https://wa.me/${waNum(p)}?text=${encodeURIComponent(text)}`;

export const SRC = ['Walk-in', 'Phone', 'WhatsApp', 'Website', 'Booking.com', 'Agoda', 'Airbnb', 'Travel agent', 'Other'];
export const METH = ['Cash', 'Bank transfer', 'Card', 'Online'];
export const CAT_IN = ['Room', 'Food & drinks', 'Excursion', 'Transfer', 'Laundry', 'Other income'];
export const CAT_OUT = ['Salaries', 'Electricity', 'Water', 'Food supplies', 'Cleaning supplies', 'Repairs', 'Laundry',
  'Internet & phone', 'Commission', 'Rent', 'Transport & fuel', 'Taxes (TGST / Green tax)', 'Marketing', 'Other expense'];
export const BST = {
  request: ['New request', 's-arr'], booked: ['Confirmed', 's-conf'], in: ['Checked in', 's-occ'], out: ['Checked out', 's-ready'], cancel: ['Cancelled', 's-maint'],
};
export const PAY_KINDS = ['Deposit', 'Part payment', 'Full payment', 'Balance payment'];

// a reservation can hold several rooms: rows that share group_id
export const groupOf = (b, bookings) => bookings.filter((x) => (x.group_id || x.id) === (b.group_id || b.id));
export const gid = (b) => b.group_id || b.id;

// room-nights sold ÷ room-nights available in a date range [from, to)
export function occupancy(rooms, bookings, from, to) {
  const days = nights(from, to);
  const avail = rooms.length * days;
  let sold = 0;
  bookings.forEach((b) => {
    if (!['booked', 'in', 'out'].includes(b.status) || !b.room_id) return;
    const a = b.check_in > from ? b.check_in : from;
    const z = b.check_out < to ? b.check_out : to;
    if (z > a) sold += nights(a, z);
  });
  return { sold, avail, pct: avail ? Math.round((sold / avail) * 100) : 0 };
}

export const lineTot = (i) => (+i.q || 0) * (+i.n > 0 ? +i.n : 1) * (+i.p || 0);
export const qtyLines = (i, cur) =>
  +i.n > 0
    ? [`${i.q} room${+i.q === 1 ? '' : 's'} × ${i.n} night${+i.n === 1 ? '' : 's'}`, `${cur} ${num(i.p)} per room / night`]
    : [`${i.q} × ${cur} ${num(i.p)}`];

export const conv = (a, from, to, fx) => {
  fx = +fx || 1;
  if (!from || from === to) return +a || 0;
  return to === 'USD' ? (+a || 0) / fx : (+a || 0) * fx;
};

export function calc(b, st = {}) {
  const R = b.rates || { service: st.service, tgst: st.tgst, green_tax: st.green_tax, fx: st.fx };
  const sub = (b.items || []).reduce((a, i) => a + lineTot(i), 0);
  const disc = +b.discount || 0;
  const net = Math.max(0, sub - disc);
  const svc = b.svc_on ? (net * (+R.service || 0)) / 100 : 0;
  const tg = b.tgst_on ? ((net + svc) * (+R.tgst || 0)) / 100 : 0;
  const green = (+b.green_units || 0) * (+R.green_tax || 0) * (b.currency === 'MVR' ? +R.fx || +st.fx || 1 : 1);
  return { sub: r2(sub), disc: r2(disc), net: r2(net), svc: r2(svc), tg: r2(tg), green: r2(green), total: r2(net + svc + tg + green), R };
}

export const billPays = (b, txns) =>
  txns.filter((t) => t.type === 'in' && (t.bill_id === b.id || (b.kind === 'invoice' && b.booking_id && t.booking_id === b.booking_id)));
export const paidOf = (b, txns, fx) => r2(billPays(b, txns).reduce((a, t) => a + conv(t.amount, t.currency, b.currency, fx), 0));

export function billState(b, txns, st) {
  if (b.kind === 'quote') {
    const m = { draft: ['Draft', 's-maint'], sent: ['Sent', 's-arr'], accepted: ['Accepted', 's-ready'], declined: ['Declined', 's-occ'], converted: ['Invoiced', 's-ready'] };
    return m[b.status] || m.draft;
  }
  const tot = calc(b, st).total, p = paidOf(b, txns, st?.fx);
  if (p >= tot - 0.005 && tot > 0) return ['Paid', 's-ready'];
  if (p > 0) return ['Partially paid', 's-clean'];
  return ['Unpaid', 's-occ'];
}

export function roomState(r, bookings) {
  const t = today();
  const inH = bookings.find((b) => b.room_id === r.id && b.status === 'in');
  if (inH) return { k: 'occ', lab: 'Occupied', b: inH };
  const arr = bookings.find((b) => b.room_id === r.id && b.status === 'booked' && b.check_in <= t && t < b.check_out);
  if (arr) return { k: 'arr', lab: arr.check_in === t ? 'Arriving today' : 'Reserved', b: arr };
  if (r.status === 'cleaning') return { k: 'clean', lab: 'Needs cleaning' };
  if (r.status === 'maint') return { k: 'maint', lab: 'Maintenance' };
  return { k: 'ready', lab: 'Ready' };
}

export function friendly(error) {
  const m = error?.message || String(error || 'Something went wrong');
  if (m.includes('bookings_no_overlap')) return 'That room is already booked for those dates';
  if (m.includes('row-level security') || m.includes('permission denied')) return 'Your account is not allowed to do that';
  if (m.includes('room_needed')) return 'Choose a room before confirming';
  if (m.includes('dates_ok')) return 'Check-out must be after check-in';
  return m;
}

export function downloadFile(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function resizeImage(file, max, type = 'image/jpeg') {
  const url = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(im.width, im.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  return new Promise((res) => cv.toBlob(res, type, 0.85));
}
