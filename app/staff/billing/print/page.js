'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStaff } from '@/lib/staffContext';
import BillPaper, { ReceiptPaper } from '@/components/BillPaper';
import { calc, dL, gid, paidOf } from '@/lib/util';
import { resCharge, resPaid, resRooms } from '@/components/Sheets';

function Print() {
  const p = useSearchParams();
  const all = useStaff();
  const { bills, bookings, rooms, txns, settings, signature } = all;
  const b = bills.find((x) => x.id === p.get('id'));
  const t = txns.find((x) => x.id === p.get('receipt'));
  let paper = null;
  if (b) paper = <BillPaper bill={b} settings={settings} signature={signature} txns={txns} />;
  else if (t) {
    const inv = t.bill_id ? bills.find((x) => x.id === t.bill_id) : t.booking_id ? bills.find((x) => x.kind === 'invoice' && x.booking_id === t.booking_id) : null;
    let sum = null;
    if (inv) sum = { label: `Invoice ${inv.no}`, total: calc(inv, settings).total, received: paidOf(inv, txns, settings.fx), currency: inv.currency };
    else if (t.booking_id) {
      const rows = bookings.filter((x) => gid(x) === t.booking_id);
      if (rows.length) {
        const rn = resRooms(rows, rooms).map((r) => r.name).join(', ');
        sum = { label: `Accommodation${rn ? ' – Room ' + rn : ''}\n${dL(rows[0].check_in)} – ${dL(rows[0].check_out)}`, total: resCharge(rows), received: resPaid(t.booking_id, txns, settings.base, settings.fx), currency: settings.base };
      }
    }
    paper = <ReceiptPaper txn={t} settings={settings} signature={signature} summary={sum} />;
  }
  if (!paper) return <div className="empty">Document not found</div>;
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 12 }}>
        <button className="btn pri" onClick={() => window.print()}>Print / Save as PDF</button>
        <span className="small muted">To get a PDF, choose “Save as PDF” as the printer.</span>
      </div>
      <div className="paper" style={{ maxWidth: 800, margin: 'auto' }}>{paper}</div>
    </>
  );
}

export default function PrintPage() {
  return <Suspense fallback={<div className="empty">Loading…</div>}><Print /></Suspense>;
}
