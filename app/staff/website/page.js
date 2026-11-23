'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStaff } from '@/lib/staffContext';
import { money, resizeImage } from '@/lib/util';

const MAX_VIDEO_MB = 50;

async function uploadFile(file, folder) {
  const isVideo = file.type.startsWith('video/');
  if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Video is larger than ${MAX_VIDEO_MB} MB. Please shorten or compress it.`);
  const body = isVideo ? file : await resizeImage(file, 2000);
  const ext = isVideo ? (file.name.split('.').pop() || 'mp4').toLowerCase() : 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, body, { contentType: isVideo ? file.type : 'image/jpeg' });
  if (error) throw error;
  return { path, url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl, kind: isVideo ? 'video' : 'photo' };
}

function SettingsForm({ fields, children }) {
  const { settings: s, run } = useStaff();
  async function save(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await run(supabase.from('settings').update({ ...f, updated_at: new Date().toISOString() }).eq('id', 1), 'Saved. The website updates within a minute.');
  }
  return (
    <form className="card" onSubmit={save}>
      {children}
      <div className="fg">
        {fields.map(([k, label, type, ph]) => (
          <label key={k} className={type === 'area' || type === 'full' ? 'full' : ''}>{label}
            {type === 'area' ? <textarea name={k} defaultValue={s[k] || ''} placeholder={ph} rows={5} /> : <input name={k} defaultValue={s[k] || ''} placeholder={ph} type={type === 'email' ? 'email' : 'text'} />}
          </label>
        ))}
      </div>
      <div className="actions"><button className="btn pri">Save</button></div>
    </form>
  );
}

function Homepage() {
  const { settings: s, run, toast } = useStaff();
  const [busy, setBusy] = useState('');
  async function pick(e, key) {
    const file = e.target.files[0]; if (!file) return;
    setBusy(key);
    try {
      const up = await uploadFile(file, key === 'logo_url' ? 'brand' : 'cover');
      await run(supabase.from('settings').update({ [key]: up.url }).eq('id', 1), key === 'logo_url' ? 'Logo updated' : 'Cover updated');
    } catch (err) { toast(err.message || 'Upload failed'); }
    setBusy('');
  }
  return (
    <div className="grid">
      <div className="card">
        <h2>Logo & homepage cover</h2>
        <div className="fg">
          <div><label>Logo</label><div className="row" style={{ marginTop: 6 }}>
            <img src={s.logo_url || '/logo.png'} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />
            <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy === 'logo_url' ? 'Uploading…' : 'Change logo'}<input type="file" accept="image/*" hidden onChange={(e) => pick(e, 'logo_url')} /></label>
          </div></div>
          <div><label>Homepage cover photo</label><div className="row" style={{ marginTop: 6 }}>
            {s.hero_url ? <img src={s.hero_url} alt="" style={{ width: 140, height: 84, objectFit: 'cover', borderRadius: 10 }} /> : <span className="small muted">Showing the drawn island picture</span>}
            <label className="btn sm" style={{ color: 'var(--ink)' }}>{busy === 'hero_url' ? 'Uploading…' : 'Change cover'}<input type="file" accept="image/*" hidden onChange={(e) => pick(e, 'hero_url')} /></label>
            {s.hero_url ? <button className="btn sm danger" onClick={() => run(supabase.from('settings').update({ hero_url: '' }).eq('id', 1), 'Cover removed')}>Remove</button> : null}
          </div></div>
        </div>
        <p className="small muted">Tip: you can also set any gallery photo as the cover from the Gallery tab.</p>
      </div>
      <SettingsForm fields={[['name', 'Guesthouse name'], ['tagline', 'Tagline under the name', 'full'], ['welcome', 'Welcome text', 'area']]}><h2>Welcome section</h2></SettingsForm>
    </div>
  );
}

function Rooms() {
  const { rooms, settings, run, open } = useStaff();
  async function quickSetup(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const n = Math.min(60, Math.max(1, +f.n || 1));
    const rows = [...Array(n)].map((_, i) => ({ name: String(101 + i), type: f.type, rate: +f.rate || 0, max_guests: 2, sort: i, facilities: 'Air conditioning, Hot water, Wi-Fi' }));
    await run(supabase.from('rooms').insert(rows), `${n} rooms created — tap one to edit`);
  }
  const toggle = (r) => run(supabase.from('rooms').update({ is_public: !r.is_public }).eq('id', r.id), r.is_public ? 'Hidden from website' : 'Published');
  if (!rooms.length) {
    return (
      <form className="card" style={{ maxWidth: 560 }} onSubmit={quickSetup}>
        <h2>Quick setup</h2>
        <p className="muted">Create your rooms in one go, then add photos, facilities and descriptions.</p>
        <div className="fg">
          <label>How many rooms?<input name="n" type="number" min="1" max="60" defaultValue="6" required /></label>
          <label>Price per night ({settings.base})<input name="rate" type="number" min="0" step="0.01" defaultValue="470" /></label>
          <label>Room type<input name="type" defaultValue="Double room" /></label>
        </div>
        <div className="actions"><button className="btn pri">Create rooms</button><button type="button" className="btn" onClick={() => open('roomForm')}>Add one room</button></div>
      </form>
    );
  }
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}><h2 style={{ margin: 0 }}>Rooms, prices & facilities</h2><button className="btn coral" onClick={() => open('roomForm')}>+ Add room</button></div>
      <div className="list">
        {rooms.map((r) => (
          <div key={r.id} className="item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
            {r.photo ? <img src={r.photo} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8 }} /> : <span style={{ width: 64, height: 48, borderRadius: 8, background: 'var(--soft)' }} />}
            <div className="grow"><b>{r.name} · {r.type}</b><span className="small muted">{money(r.rate, settings.base)} / night · {r.max_guests} guests{r.facilities ? ` · ${r.facilities}` : ''}</span></div>
            <div className="row">
              <button className={`btn sm ${r.is_public ? '' : 'danger'}`} onClick={() => toggle(r)}>{r.is_public ? 'Published' : 'Hidden'}</button>
              <button className="btn sm pri" onClick={() => open('roomForm', { id: r.id })}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gallery() {
  const { gallery, rooms, run, reload, toast, confirm } = useStaff();
  const [busy, setBusy] = useState('');
  async function add(e) {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const up = await uploadFile(files[i], 'gallery');
        const { error } = await supabase.from('gallery').insert({ kind: up.kind, url: up.url, path: up.path, published: true, sort: gallery.length + i });
        if (error) throw error;
        ok++;
      } catch (err) { toast(err.message || 'Upload failed'); }
    }
    setBusy('');
    await reload();
    if (ok) toast(`${ok} item${ok > 1 ? 's' : ''} added and published`);
  }
  async function del(g) {
    if (!(await confirm('Remove this from the gallery and delete the file?', 'Remove'))) return;
    if (g.path) await supabase.storage.from('media').remove([g.path]);
    await run(supabase.from('gallery').delete().eq('id', g.id), 'Removed');
  }
  const upd = (g, patch, msg) => run(supabase.from('gallery').update(patch).eq('id', g.id), msg);
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Photo & video gallery</h2>
        <label className="btn coral" style={{ color: '#fff' }}>{busy || '+ Upload photos / videos'}<input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple hidden onChange={add} disabled={!!busy} /></label>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>Only items marked Published appear on the website. Videos up to {MAX_VIDEO_MB} MB (MP4 works best).</p>
      {gallery.length ? (
        <div className="gal-admin">
          {gallery.map((g) => (
            <div key={g.id} className={`g ${g.published ? '' : 'off'}`}>
              {g.kind === 'video' ? <video src={g.url} muted playsInline preload="metadata" controls /> : <img src={g.url} alt={g.caption || ''} />}
              <div className="bd">
                <input defaultValue={g.caption || ''} placeholder="Caption" aria-label="Caption" onBlur={(e) => e.target.value !== (g.caption || '') && upd(g, { caption: e.target.value }, 'Caption saved')} />
                <select value={g.room_id || ''} onChange={(e) => upd(g, { room_id: e.target.value || null }, 'Saved')} aria-label="Room">
                  <option value="">General / guesthouse</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.name}</option>)}
                </select>
                <input type="number" defaultValue={g.sort || 0} aria-label="Order" title="Order (lower first)" onBlur={(e) => +e.target.value !== (g.sort || 0) && upd(g, { sort: +e.target.value || 0 }, 'Order saved')} />
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm" onClick={() => upd(g, { published: !g.published }, g.published ? 'Hidden' : 'Published')}>{g.published ? 'Published' : 'Hidden'}</button>
                  {g.kind === 'photo' ? <button className="btn sm" onClick={() => run(supabase.from('settings').update({ hero_url: g.url }).eq('id', 1), 'Set as homepage cover')}>Cover</button> : null}
                  <button className="btn sm danger" onClick={() => del(g)} aria-label="Remove">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">No photos or videos yet</div>}
    </div>
  );
}

export default function Website() {
  const [tab, setTab] = useState('home');
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t) setTab(t); }, []);
  const tabs = [['home', 'Homepage'], ['rooms', 'Rooms'], ['gallery', 'Gallery'], ['info', 'Guesthouse & kitchen'], ['contact', 'Contact & location']];
  return (
    <>
      <div className="pagehead">
        <h1>Website & Gallery</h1>
        <a className="btn" href="/" target="_blank" rel="noopener">View website</a>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'home' ? <Homepage /> : tab === 'rooms' ? <Rooms /> : tab === 'gallery' ? <Gallery /> : tab === 'info' ? (
        <SettingsForm fields={[
          ['about', 'About the guesthouse', 'area', 'Who you are, what guests love about staying with you'],
          ['house_info', 'Guesthouse information', 'area', 'Check-in 2 pm, check-out 12 pm\nAirport / ferry transfers on request\nHouse rules…'],
          ['kitchen_info', 'Kitchen & meals', 'area', 'Breakfast included\nLocal Maldivian dinners on request\nShared guest kitchen…'],
        ]}><h2>Guesthouse & kitchen information</h2><p className="small muted" style={{ marginTop: 0 }}>Empty sections are hidden on the website.</p></SettingsForm>
      ) : (
        <SettingsForm fields={[
          ['phones', 'Phone numbers'], ['whatsapp', 'WhatsApp number (with 960)'], ['email', 'Email', 'email'],
          ['address', 'Address', 'full'], ['map_url', 'Google Maps link', 'full', 'https://maps.app.goo.gl/…'],
        ]}><h2>Contact & location</h2></SettingsForm>
      )}
    </>
  );
}
