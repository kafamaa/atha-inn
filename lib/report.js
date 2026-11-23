import { addD, conv, iso, occupancy } from '@/lib/util';

export const monthDays = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
export const monthLabel = (m) => new Date(m + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const shiftMonth = (m, n) => { const d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); };

// everything a monthly report needs, in the main currency
export function monthReport(m, { txns, rooms, bookings, settings }) {
  const cur = settings.base || 'MVR';
  const base = (x) => conv(x.amount, x.currency, cur, settings.fx);
  const from = m + '-01', to = addD(from, monthDays(m));
  const tx = txns.filter((x) => (x.date || '').startsWith(m));
  const guest = tx.filter((x) => x.type === 'in' && (x.receipt_no || x.booking_id || x.bill_id)).reduce((a, x) => a + base(x), 0);
  const inc = tx.filter((x) => x.type === 'in').reduce((a, x) => a + base(x), 0);
  const exp = tx.filter((x) => x.type === 'out').reduce((a, x) => a + base(x), 0);
  const cats = (type) => {
    const c = {};
    tx.filter((x) => x.type === type).forEach((x) => { c[x.cat] = (c[x.cat] || 0) + base(x); });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  };
  const days = [...Array(monthDays(m))].map((_, i) => {
    const d = addD(from, i);
    const T = tx.filter((x) => x.date === d);
    const di = T.filter((x) => x.type === 'in').reduce((a, x) => a + base(x), 0);
    const de = T.filter((x) => x.type === 'out').reduce((a, x) => a + base(x), 0);
    const occ = bookings.filter((b) => ['booked', 'in', 'out'].includes(b.status) && b.room_id && b.check_in <= d && d < b.check_out).length;
    return { d, inc: di, exp: de, bal: di - de, occ };
  });
  return { cur, tx, inc, exp, bal: inc - exp, guest, other: inc - guest, catsIn: cats('in'), catsOut: cats('out'), days, occ: occupancy(rooms, bookings, from, to) };
}

export const csv = (rows) => rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
