'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStaff } from '@/lib/staffContext';
import BillPaper from '@/components/BillPaper';

function Print() {
  const id = useSearchParams().get('id');
  const { bills, settings, signature, txns } = useStaff();
  const b = bills.find((x) => x.id === id);
  if (!b) return <div className="empty">Bill not found</div>;
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 12 }}>
        <button className="btn pri" onClick={() => window.print()}>Print / Save as PDF</button>
        <span className="small muted">Choose “Save as PDF” as the printer to get a PDF file.</span>
      </div>
      <div className="paper" style={{ maxWidth: 800, margin: 'auto' }}>
        <BillPaper bill={b} settings={settings} signature={signature} txns={txns} />
      </div>
    </>
  );
}

export default function PrintPage() {
  return <Suspense fallback={<div className="empty">Loading…</div>}><Print /></Suspense>;
}
