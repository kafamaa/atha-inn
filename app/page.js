import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/PublicNav';
import Gallery from '@/components/Gallery';
import { num, waLink } from '@/lib/util';

export const revalidate = 60;

async function load() {
  try {
    const [i, r, g] = await Promise.all([
      supabase.from('public_info').select('*').maybeSingle(),
      supabase.from('public_rooms').select('*').order('sort').order('name'),
      supabase.from('public_gallery').select('*').order('sort').order('created_at', { ascending: false }),
    ]);
    return { info: i.data || {}, rooms: r.data || [], gallery: g.data || [] };
  } catch {
    return { info: {}, rooms: [], gallery: [] };
  }
}

function LagoonArt() {
  return (
    <svg className="art" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="1040" cy="150" r="60" fill="#fff6d8" opacity=".9" />
      <path d="M0 430 Q300 400 600 430 T1200 430 V700 H0Z" fill="#1d8ea0" />
      <path d="M0 480 Q300 455 600 480 T1200 480 V700 H0Z" fill="#137485" />
      <g transform="translate(560 0)"><ellipse cx="300" cy="470" rx="260" ry="34" fill="#f4e7c8" />
      <path d="M300 468 C296 400 304 350 330 300" stroke="#5b4630" strokeWidth="9" fill="none" strokeLinecap="round" />
      <g fill="#1f6b47">
        <path d="M330 300 C290 280 250 290 225 315 C265 300 295 302 330 300Z" />
        <path d="M330 300 C360 265 405 262 430 280 C395 280 365 287 330 300Z" />
        <path d="M330 300 C325 255 345 225 375 215 C355 240 345 268 330 300Z" />
        <path d="M330 300 C300 260 265 250 240 258 C275 270 302 283 330 300Z" />
        <path d="M330 300 C370 300 400 320 410 345 C385 325 360 312 330 300Z" />
      </g></g>
      <path d="M0 560 Q300 540 600 560 T1200 560 V700 H0Z" fill="#0b4f5c" />
    </svg>
  );
}

const facList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export default async function Home() {
  const { info, rooms, gallery } = await load();
  const name = info.name || 'Atha Inn';
  const cur = info.base || 'MVR';
  const wa = info.whatsapp || '9607587079';
  const from = rooms.length ? Math.min(...rooms.map((r) => +r.rate || 0)) : 0;
  const roomPhotos = (id) => gallery.filter((g) => g.room_id === id && g.kind === 'photo');
  return (
    <>
      <PublicNav info={info} />
      <section className="hero">
        {info.hero_url ? <img className="bg" src={info.hero_url} alt="" /> : <LagoonArt />}
        <div className="copy">
          <h1>{name}</h1>
          <p>{info.tagline || 'A calm island guesthouse in Kanditheemu'}{from ? ` · rooms from ${cur} ${num(from)} a night` : ''}</p>
          <div className="row">
            <Link href="/book" className="btn coral">Check availability</Link>
            <a className="btn" href={waLink(wa, `Hello ${name}, I would like to book a room.`)} target="_blank" rel="noopener">WhatsApp us</a>
          </div>
        </div>
      </section>

      {info.welcome ? (
        <section className="section welcome">
          <img src={info.logo_url || '/logo.png'} alt={`${name} logo`} width="96" height="96" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          <div><h2>Welcome</h2><p style={{ fontSize: 18, maxWidth: '40em', margin: 0, whiteSpace: 'pre-line' }}>{info.welcome}</p></div>
        </section>
      ) : null}

      <section className="section" id="rooms" style={{ paddingTop: info.welcome ? 0 : undefined }}>
        <h2>Rooms</h2>
        <p className="muted">Prices are per room, per night{rooms.length ? '' : ' — rooms will appear here soon'}.</p>
        <div className="rooms-grid">
          {rooms.map((r) => {
            const ph = r.photo || roomPhotos(r.id)[0]?.url;
            return (
              <article className="room-card" key={r.id}>
                <div className="ph">{ph ? <img src={ph} alt={`Room ${r.name}`} loading="lazy" /> : r.type || r.name}</div>
                <div className="bd">
                  <h3 style={{ fontSize: 20 }}>{r.type || `Room ${r.name}`}</h3>
                  <span className="muted small">Room {r.name} · up to {r.max_guests} guests</span>
                  {facList(r.facilities).length ? <div className="fac">{facList(r.facilities).map((f) => <span key={f}>{f}</span>)}</div> : null}
                  {r.description ? <p style={{ margin: '4px 0', whiteSpace: 'pre-line' }}>{r.description}</p> : null}
                  <div className="row between" style={{ marginTop: 'auto' }}>
                    <span className="price">{cur} {num(r.rate)} <small>/ night</small></span>
                    <Link className="btn pri sm" href={`/book?room=${r.id}`}>Book</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {info.about || info.house_info || info.kitchen_info ? (
        <div className="band-sand" id="about">
          <section className="section">
            <h2>About {name}</h2>
            {info.about ? <p style={{ maxWidth: '42em', fontSize: 18, whiteSpace: 'pre-line' }}>{info.about}</p> : null}
            <div className="info-grid">
              {info.house_info ? <div className="info-card"><h3>The guesthouse</h3><p>{info.house_info}</p></div> : null}
              {info.kitchen_info ? <div className="info-card"><h3>Kitchen & meals</h3><p>{info.kitchen_info}</p></div> : null}
            </div>
          </section>
        </div>
      ) : null}

      {gallery.length ? (
        <section className="section" id="gallery">
          <h2>Gallery</h2>
          <p className="muted">Photos and videos of {name} and Kanditheemu.</p>
          <Gallery items={gallery} />
        </section>
      ) : null}

      <div className="band-sand" id="contact">
        <section className="section">
          <h2>Contact & location</h2>
          <div className="facts">
            <div className="fact"><b>Where</b>{info.address}{info.map_url ? <><br /><a href={info.map_url} target="_blank" rel="noopener">Open in Google Maps</a></> : null}</div>
            <div className="fact"><b>Call</b>{String(info.phones || '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
              <div key={p}><a href={`tel:+960${p.replace(/\D/g, '').slice(-7)}`}>{p}</a></div>))}</div>
            <div className="fact"><b>WhatsApp</b><a href={waLink(wa, `Hello ${name}`)} target="_blank" rel="noopener">Message us</a>{info.email ? <><br /><a href={`mailto:${info.email}`}>{info.email}</a></> : null}</div>
          </div>
          <div className="actions"><Link href="/book" className="btn coral">Request a booking</Link></div>
        </section>
      </div>

      <footer className="pub-foot">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {name} · {info.address}</span>
          <Link href="/login">Admin login</Link>
        </div>
      </footer>
    </>
  );
}
