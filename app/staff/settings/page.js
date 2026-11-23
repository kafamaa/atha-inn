'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStaff } from '@/lib/staffContext';
import { resizeImage } from '@/lib/util';

function Accounts() {
  const { staff, profile, session, reload, toast, confirm } = useStaff();
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState(null);
  async function call(method, body) {
    setBusy(true);
    const res = await fetch('/api/staff', { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(j.error || 'Failed'); return false; }
    await reload();
    return true;
  }
  async function add(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await call('POST', Object.fromEntries(new FormData(form)))) { toast('Account created — give them the email and password'); form.reset(); }
  }
  async function remove(u) {
    if (await confirm(`Remove ${u.name || u.email}? They will no longer be able to log in.`, 'Remove')) {
      if (await call('DELETE', { id: u.id })) toast('Removed');
    }
  }
  return (
    <div className="card">
      <h2>Admin accounts</h2>
      <p className="small muted" style={{ marginTop: 0 }}>Every account (owner, reception, staff) has the same full access.</p>
      <div className="list">
        {staff.map((u) => (
          <div key={u.id} className="item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
            <div className="grow"><b>{u.name || u.email}</b><span className="small muted">{u.email}</span></div>
            {u.id === profile.id ? <span className="chip s-ready">You</span> : pw?.id === u.id ? (
              <form className="row" onSubmit={async (e) => { e.preventDefault(); if (await call('PATCH', { id: u.id, password: pw.value })) { toast('Password changed'); setPw(null); } }}>
                <input type="text" minLength={8} required placeholder="New password (8+)" value={pw.value} onChange={(e) => setPw({ id: u.id, value: e.target.value })} style={{ width: 200 }} />
                <button className="btn sm pri" disabled={busy}>Save</button><button type="button" className="btn sm" onClick={() => setPw(null)}>Cancel</button>
              </form>
            ) : (
              <div className="row">
                <button className="btn sm" disabled={busy} onClick={() => setPw({ id: u.id, value: '' })}>Reset password</button>
                <button className="btn sm danger" disabled={busy} onClick={() => remove(u)}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={add} style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Add an admin</h3>
        <div className="fg">
          <label>Name<input name="name" required placeholder="Reception" /></label>
          <label>Email (used to log in)<input name="email" type="email" required /></label>
          <label>Password (8+ characters)<input name="password" type="text" minLength={8} required /></label>
        </div>
        <div className="actions"><button className="btn pri" disabled={busy}>Create account</button></div>
      </form>
    </div>
  );
}

export default function Settings() {
  const { settings: s, signature, run, toast } = useStaff();
  const [sig, setSig] = useState(signature || '');
  async function pickSig(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const blob = await resizeImage(f, 320, 'image/png');
      setSig(await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }));
    } catch { toast('Could not read that image'); }
  }
  async function save(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    ['fx', 'tgst', 'service', 'green_tax', 'inv_next', 'qt_next', 'rc_next'].forEach((k) => { f[k] = +f[k] || 0; });
    f.sig_on = !!f.sig_on;
    const ok = await run(supabase.from('settings').update({ ...f, updated_at: new Date().toISOString() }).eq('id', 1));
    if (ok && sig !== signature) await run(supabase.from('secrets').update({ signature: sig }).eq('id', 1));
    if (ok) toast('Settings saved');
  }
  const field = (name, label, type = 'text', extra = {}) => <label key={name} className={extra.full ? 'full' : ''}>{label}<input name={name} type={type} step={type === 'number' ? 'any' : undefined} defaultValue={s[name] ?? ''} placeholder={extra.ph} /></label>;
  return (
    <>
      <div className="pagehead"><h1>Settings</h1></div>
      <form className="card" onSubmit={save} style={{ marginBottom: 14 }}>
        <h2>Money & tax</h2>
        <div className="fg">
          <label>Main currency<select name="base" defaultValue={s.base}><option>MVR</option><option>USD</option></select></label>
          {field('fx', 'MVR per 1 USD', 'number')}
          {field('tgst', 'T-GST %', 'number')}
          {field('service', 'Service charge %', 'number')}
          {field('green_tax', 'Green tax per guest-night (USD)', 'number')}
          {field('tin', 'TIN / GST no. (shown on documents)')}
        </div>
        <h2 style={{ marginTop: 18 }}>Document numbers</h2>
        <div className="fg">
          {field('inv_pre', 'Invoice prefix')}{field('inv_next', 'Next invoice number', 'number')}
          {field('qt_pre', 'Quotation prefix')}{field('qt_next', 'Next quotation number', 'number')}
          {field('rc_pre', 'Receipt prefix')}{field('rc_next', 'Next receipt number', 'number')}
        </div>
        <p className="small muted">Numbers continue automatically (AT/2026/03, AT/2026/04…). Only raise “next number” to skip ahead.</p>
        <h2 style={{ marginTop: 18 }}>On documents</h2>
        <div className="fg">
          <label className="full">Payment details<textarea name="bank" defaultValue={s.bank || ''} /></label>
          {field('footer_q', 'Message on quotations', 'text', { full: true })}
          {field('footer_i', 'Message on invoices', 'text', { full: true })}
          {field('footer_r', 'Message on receipts', 'text', { full: true })}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div><label>Signature</label><div className="row" style={{ marginTop: 6 }}>
            {sig ? <img src={sig} alt="" style={{ height: 52, maxWidth: 140, background: '#fff', borderRadius: 8, border: '1px solid var(--line)' }} /> : <span className="small muted">No signature</span>}
            <label className="btn sm" style={{ color: 'var(--ink)' }}>Change<input type="file" accept="image/*" hidden onChange={pickSig} /></label>
          </div></div>
          <label className="check"><input type="checkbox" name="sig_on" defaultChecked={s.sig_on} />Show signature on documents</label>
        </div>
        <p className="small muted">Tax rates are copied into each new invoice, so old invoices never change. Check current T-GST and Green Tax rates with MIRA.</p>
        <div className="actions"><button className="btn pri">Save settings</button></div>
      </form>
      <Accounts />
      <p className="small muted" style={{ marginTop: 14 }}>Business name, logo, contact details and website text are in Website & Gallery.</p>
    </>
  );
}
