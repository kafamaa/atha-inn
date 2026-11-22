'use client';
import { calc, dN, lineTot, money, num, paidOf, qtyLines } from '@/lib/util';

const bd = { border: '1px solid #b9c3cc', padding: '5px 8px' };
const hd = { ...bd, background: '#e8edf3', fontWeight: 700 };

function Row({ label, value, grand }) {
  const s = grand ? { background: '#e8edf3', fontWeight: 700 } : undefined;
  return (
    <tr style={s}>
      <td style={{ ...bd, textAlign: 'right', width: '50%' }}>{label}</td>
      <td style={{ ...bd, textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</td>
    </tr>
  );
}

export default function BillPaper({ bill: b, settings: st, signature, txns }) {
  const c = calc(b, st);
  const cur = b.currency;
  const isQ = b.kind === 'quote';
  const paid = isQ ? 0 : paidOf(b, txns || [], st.fx);
  const foot = isQ ? st.footer_q : st.footer_i;
  const rooms = (b.items || []).some((i) => +i.n > 0);
  return (
    <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif", color: '#1c2733', fontSize: 14, lineHeight: 1.4 }}>
      <div className="bill-head" style={{ borderBottom: '1px solid #9aa5ae', paddingBottom: 18, marginBottom: 18 }}>
        <img className="bill-logo" src={st.logo_url || '/logo.png'} alt="" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{st.name}</div>
          <div>{st.address}</div>
          <div>{st.phones}</div>
          {st.email ? <div>{st.email}</div> : null}
          {st.tin ? <div>TIN: {st.tin}</div> : null}
        </div>
        <div className="bill-title">{isQ ? 'QUOTATION' : 'INVOICE'}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ fontWeight: 700 }}>
          {isQ ? 'PREPARED FOR' : 'BILL TO'}<br />
          {String(b.customer || '').toUpperCase()}
          {b.caddr ? <><br />{String(b.caddr).toUpperCase()}</> : null}
          {b.phone ? <div style={{ fontWeight: 400 }}>{b.phone}</div> : null}
        </div>
        <div style={{ textAlign: 'right' }}>
          No.&nbsp; {b.no || '(new)'}<br />Date&nbsp; {dN(b.date)}
          {b.due ? <><br />{isQ ? 'Valid until' : 'Due'}&nbsp; {dN(b.due)}</> : null}
        </div>
      </div>

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
          {!isQ && paid ? <><Row label="PAID" value={money(paid, cur)} /><Row label="BALANCE DUE" value={money(Math.max(0, c.total - paid), cur)} grand /></> : null}
        </tbody>
      </table>

      {b.notes ? <p style={{ margin: '16px 0 0', whiteSpace: 'pre-wrap' }}>{b.notes}</p> : null}
      {foot ? <p style={{ textAlign: 'center', margin: '26px 0' }}>{foot}</p> : <div style={{ height: 26 }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ whiteSpace: 'pre-line' }}>{st.bank ? `PAYMENT DETAILS\n${st.bank}` : ''}</div>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <b>FOR {String(st.name || '').toUpperCase()}</b>
          <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {st.sig_on && signature ? <img src={signature} alt="" style={{ maxHeight: 58, maxWidth: 160 }} /> : null}
          </div>
          AUTHORIZED SIGNATURE
        </div>
      </div>
    </div>
  );
}
