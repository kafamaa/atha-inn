'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStaff } from '@/lib/staffContext';
import { resizeImage } from '@/lib/util';

async function uploadMedia(file, folder, max) {
  const blob = await resizeImage(file, max);
  const path = `${folder}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

function StaffAccounts() {
  const { staff, profile, session, run, reload, toast, confirm } = useStaff();
  const [busy, setBusy] = useState(false);
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
    const f = Object.fromEntries(new FormData(form));
    if (await call('POST', f)) { toast('Staff account created — give them the email and password'); form.reset(); }
  }
  async function resetPw(u) {
    const pw = window.prompt(`New password for ${u.name || u.email} (8+ characters)`);
    if (pw && (await call('PATCH', { id: u.id, password: pw }))) toast('Password changed');
  }
  async function remove(u) {
    if (await confirm(`Remove ${u.name || u.email}? They will no longer be able to log in.`, 'Remove')) {
      if (await call('DELETE', { id: u.id })) toast('Removed');
    }
  }
  const setRole = (u, role) => run(supabase.from('profiles').update({ role }).eq('id', u.id), 'Role changed');
  return (
    <div className="card">
      <h2>Staff accounts</h2>
      <div className="list">
        {staff.map((u) => (
          <div key={u.id} className="item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
            <div className="grow"><b>{u.name || u.email}</b><span className="small muted">{u.email}</span></div>
            {u.id === profile.id ? <span className="chip s-ready">You · Owner</span> : (
              <div className="row">
                <select value={u.role} onChange={(e) => setRole(u, e.target.value)} style={{ width: 'auto' }} aria-label="Role">
                  <option value="staff">Front desk</option><option value="admin">Owner / manager</option>
                </select>
                <button className="btn sm" disabled={busy} onClick={() => resetPw(u)}>Reset password</button>
                <button className="btn sm danger" disabled={busy} onClick={() => remove(u)}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={add} style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Add staff</h3>
        <div className="fg">
          <label>Name<input name="name" required /></label>
          <label>Email (used to log in)<input name="email" type="email" required /></label>
          <label>Password (8+ characters)<input name="password" type="text" minLength={8} required /></label>
          <label>Access<select name="role"><option value="staff">Front desk</option><option value="admin">Owner / manager</option></select></label>
        </div>
        <p className="small muted">Front desk: bookings, requests, rooms, bills and guest payments. They cannot see income, expenses, profit or settings.</p>
        <div className="actions"><button className="btn pri" disabled={busy}>Create account</button></div>
      </form>
    </div>
  );
}

export default function Settings() {
  const { settings: s, signature, isAdmin, run, toast } = useStaff();
  const [img, setImg] = useState({ logo_url: s.logo_url || '', hero_url: s.hero_url || '', signature: signature || '' });
  const [busy, setBusy] = useState('');
  if (!isAdmin) return <div className="card empty">Only the owner can change settings.</div>;
  async function pick(e, key) {
    const f = e.target.files[0]; if (!f) return;
    setBusy(key);
    try {
      if (key === 'signature') {
        const blob = await resizeImage(f, 320, 'image/png');
        const url = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
        setImg((x) => ({ ...x, signature: url }));
      } else {
        const url = await uploadMedia(f, key === 'logo_url' ? 'brand' : 'hero', key === 'logo_url' ? 400 : 2000);
        setImg((x) => ({ ...x, [key]: url }));
      }
    } catch (err) { toast(err.message || 'Upload failed'); }
    setBusy('');
  }
  async function save(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    ['fx', 'tgst', 'service', 'green_tax', 'inv_next', 'qt_next'].forEach((k) => { f[k] = +f[k] || 0; });
    f.sig_on = !!f.sig_on;
    const ok = await run(supabase.from('settings').update({ ...f, logo_url: img.logo_url, hero_url: img.hero_url, updated_at: new Date().toISOString() }).eq('id', 1));
    if (ok && img.signature !== signature) await run(supabase.from('secrets').update({ signature: img.signature }).eq('id', 1));
    if (ok) toast('Settings saved. The website updates within a minute.');
  }
  const field = (name, label, props = {}) => <label className={props.full ? 'full' : ''}>{label}<input name={name} defaultValue={s[name] ?? ''} {...props} full={undefined} /></label>;
  return (
    <>
      <div className="pagehead"><h1>Settings</h1></div>
      <form className="card" onSubmit={save} style={{ marginBottom: 14 }}>
        <h2>Business & website</h2>
        <div className="fg">
          {field('name', 'Guesthouse name')}
          {field('phones', 'Phone numbers')}
          {field('whatsapp', 'WhatsApp number (with 960)')}
          {field('email', 'Email', { type: 'email' })}
          {field('address', 'Address', { full: true })}
          {field('tagline', 'Website tagline', { full: true })}
          <label className="full">About (website)<textarea name="about" defaultValue={s.about || ''} /></label>
          {field('map_url', 'Google Maps link', { full: true, placeholder: 'https://maps.app.goo.gl/…' })}
          {field('tin', 'TIN / GST no.')}
        </div>
        <h2 style={{ marginTop: 18 }}>Money & tax</h2>
        <div className="fg">
          <label>Main currency<select name="base" defaultValue={s.base}><option>MVR</option><option>USD</option></select></label>
          {field('fx', 'MVR per 1 USD', { type: 'number', step: '0.01' })}
          {field('tgst', 'T-GST %', { type: 'number', step: '0.01' })}
          {field('service', 'Service charge %', { type: 'number', step: '0.01' })}
          {field('green_tax', 'Green tax per guest-night (USD)', { type: 'number', step: '0.01' })}
        </div>
        <h2 style={{ marginTop: 18 }}>Bills</h2>
        <div className="fg">
          {field('inv_pre', 'Invoice prefix')}
          {field('inv_next', 'Next invoice number', { type: 'number', min: 1 })}
          {field('qt_pre', 'Quotation prefix')}
          {field('qt_next', 'Next quotation number', { type: 'number', min: 1 })}
          <label className="full">Payment details on bills<textarea name="bank" defaultValue={s.bank || ''} /></label>
          {field('footer_q', 'Message on quotations', { full: true })}
          {field('footer_i', 'Message on invoices', { full: true })}
        </div>
        <h2 style={{ marginTop: 18 }}>Pictures</h2>
        <div className="fg">
          <div><label>Logo</label><div className="row" style={{ marginTop: 6 }}>
            <img src={img.logo_url || '/logo.png'} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
            <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy === 'logo_url' ? 'Uploading…' : 'Change'}<input type="file" accept="image/*" hidden onChange={(e) => pick(e, 'logo_url')} /></label></div></div>
          <div><label>Website cover photo</label><div className="row" style={{ marginTop: 6 }}>
            {img.hero_url ? <img src={img.hero_url} alt="" style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 8 }} /> : <span className="small muted">Using the drawn island picture</span>}
            <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy === 'hero_url' ? 'Uploading…' : 'Change'}<input type="file" accept="image/*" hidden onChange={(e) => pick(e, 'hero_url')} /></label>
            {img.hero_url ? <button type="button" className="btn sm danger" onClick={() => setImg((x) => ({ ...x, hero_url: '' }))}>Remove</button> : null}</div></div>
          <div><label>Signature (private)</label><div className="row" style={{ marginTop: 6 }}>
            {img.signature ? <img src={img.signature} alt="" style={{ height: 52, maxWidth: 130, background: '#fff', borderRadius: 8 }} /> : null}
            <label className="btn sm" style={{ color: 'var(--ink)' }}>Change<input type="file" accept="image/*" hidden onChange={(e) => pick(e, 'signature')} /></label></div>
            <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="sig_on" defaultChecked={s.sig_on} />Show signature on bills</label></div>
        </div>
        <p className="small muted">Tax rates are copied into each new bill, so old invoices never change. Check current T-GST and Green Tax rates with MIRA.</p>
        <div className="actions"><button className="btn pri" disabled={!!busy}>Save settings</button></div>
      </form>
      <StaffAccounts />
    </>
  );
}
