'use client';
import { calc, dN, lineTot, money, num, paidOf, qtyLines } from '@/lib/util';

const bd = { border: '1px solid #b9c3cc', padding: '5px 8px' };
const hd = { ...bd, background: '#e8edf3', fontWeight: 700 };
const font = { fontFamily: "Cambria, Georgia, 'Times New Roman', serif", color: '#1c2733', fontSize: 14, lineHeight: 1.4 };

function Row({ label, value, grand }) {
  const s = grand ? { background: '#e8edf3', fontWeight: 700 } : undefined;
  return (
    <tr style={s}>
      <td style={{ ...bd, textAlign: 'right', width: '50%' }}>{label}</td>
      <td style={{ ...bd, textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</td>
    </tr>
  );
}

function Head({ st, title }) {
  return (
    <div className="bill-head" style={{ borderBottom: '1px solid #9aa5ae', paddingBottom: 18, marginBottom: 18 }}>
      <img className="bill-logo" src={st.logo_url || '/logo.png'} alt="" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{st.name}</div>
        <div>{st.address}</div>
        <div>{st.phones}</div>
        {st.email ? <div>{st.email}</div> : null}
        {st.tin ? <div>TIN: {st.tin}</div> : null}
      </div>
      <div className="bill-title">{title}</div>
    </div>
  );
}

function Who({ label, name, addr, phone, no, date, extra }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
      <div style={{ fontWeight: 700 }}>
        {label}<br />{String(name || '').toUpperCase()}
        {addr ? <><br />{String(addr).toUpperCase()}</> : null}
        {phone ? <div style={{ fontWeight: 400 }}>{phone}</div> : null}
      </div>
      <div style={{ textAlign: 'right' }}>
        No.&nbsp; {no || '(new)'}<br />Date&nbsp; {dN(date)}{extra}
      </div>
    </div>
  );
}

function Foot({ st, signature, foot, bank = true }) {
  return (
    <>
      {foot ? <p style={{ textAlign: 'center', margin: '26px 0' }}>{foot}</p> : <div style={{ height: 26 }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ whiteSpace: 'pre-line' }}>{bank && st.bank ? `PAYMENT DETAILS\n${st.bank}` : ''}</div>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <b>FOR {String(st.name || '').toUpperCase()}</b>
          <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {st.sig_on && signature ? <img src={signature} alt="" style={{ maxHeight: 58, maxWidth: 160 }} /> : null}
          </div>
          AUTHORIZED SIGNATURE
        </div>
      </div>
    </>
  );
}

export default function BillPaper({ bill: b, settings: st, signature, txns }) {
  const c = calc(b, st);
  const cur = b.currency;
  const isQ = b.kind === 'quote';
  const paid = isQ ? 0 : paidOf(b, txns || [], st.fx);
  const rooms = (b.items || []).some((i) => +i.n > 0);
  return (
    <div style={font}>
      <Head st={st} title={isQ ? 'QUOTATION' : 'INVOICE'} />
      <Who label={isQ ? 'PREPARED FOR' : 'BILL TO'} name={b.customer} addr={b.caddr} phone={b.phone} no={b.no} date={b.date}
        extra={b.due ? <><br />{isQ ? 'Valid until' : 'Due'}&nbsp; {dN(b.due)}</> : null} />
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{rooms ? 'ACCOMMODATION DETAILS' : 'DETAILS'}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22, fontSize: 13 }}>
        <thead>
          <tr><th style={{ ...hd, width: '8%' }}>#</th><th style={{ ...hd, textAlign: 'left' }}>DESCRIPTION</th><th style={hd}>QTY / RATE</th><th style={hd}>TOTAL</th></tr>
        </thead>
        <tbody>
          {(b.items || []).map((i, k) => (
            <tr key={k}>
              <td style={{ ...bd, textAlign: 'center' }}>{k + 1}</td>
              <td style={{ ...bd, whiteSpace: 'pre-line' }}>{i.d}</td>
              <td style={{ ...bd, textAlign: 'center' }}>{qtyLines(i, cur).map((l, j) => <div key={j}>{l}</div>)}</td>
              <td style={{ ...bd, textAlign: 'center', whiteSpace: 'nowrap' }}>{cur} <b>{num(lineTot(i))}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          <Row label="SUBTOTAL" value={money(c.sub, cur)} />
          <Row label="DISCOUNT" value={money(c.disc, cur)} />
          {c.svc ? <Row label={`SERVICE CHARGE ${c.R.service}%`} value={money(c.svc, cur)} /> : null}
          {c.tg ? <Row label={`T-GST ${c.R.tgst}%`} value={money(c.tg, cur)} /> : null}
          {c.green ? <Row label={`GREEN TAX (${b.green_units} guest-nights)`} value={money(c.green, cur)} /> : null}
          <Row label="GRAND TOTAL" value={money(c.total, cur)} grand />
          {!isQ && paid ? <><Row label="DEPOSITS / PAYMENTS RECEIVED" value={money(paid, cur)} /><Row label="REMAINING BALANCE" value={money(Math.max(0, c.total - paid), cur)} grand /></> : null}
        </tbody>
      </table>
      {b.notes ? <p style={{ margin: '16px 0 0', whiteSpace: 'pre-wrap' }}>{b.notes}</p> : null}
      <Foot st={st} signature={signature} foot={isQ ? st.footer_q : st.footer_i} />
    </div>
  );
}

// summary: { label, total, received, currency } — the invoice or reservation this payment belongs to
export function ReceiptPaper({ txn: t, settings: st, signature, summary }) {
  const cur = t.currency;
  return (
    <div style={font}>
      <Head st={st} title="RECEIPT" />
      <Who label="RECEIVED FROM" name={t.payer || t.note} no={t.receipt_no} date={t.date} />
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22, fontSize: 13 }}>
        <thead><tr><th style={{ ...hd, textAlign: 'left' }}>DESCRIPTION</th><th style={hd}>METHOD</th><th style={hd}>AMOUNT</th></tr></thead>
        <tbody>
          <tr>
            <td style={{ ...bd, whiteSpace: 'pre-line' }}>{[t.pay_kind || 'Payment', summary?.label, t.note && t.note !== t.payer ? t.note : ''].filter(Boolean).join('\n')}</td>
            <td style={{ ...bd, textAlign: 'center' }}>{t.method}</td>
            <td style={{ ...bd, textAlign: 'center', whiteSpace: 'nowrap' }}>{cur} <b>{num(t.amount)}</b></td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          <Row label="AMOUNT RECEIVED" value={money(t.amount, cur)} grand />
          {summary ? <>
            <Row label="TOTAL CHARGES" value={money(summary.total, summary.currency)} />
            <Row label="TOTAL RECEIVED TO DATE" value={money(summary.received, summary.currency)} />
            <Row label="REMAINING BALANCE" value={money(Math.max(0, summary.total - summary.received), summary.currency)} grand />
          </> : null}
        </tbody>
      </table>
      <Foot st={st} signature={signature} foot={st.footer_r} bank={false} />
    </div>
  );
}
