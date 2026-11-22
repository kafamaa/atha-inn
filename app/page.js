import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/PublicNav';
import { num, waLink } from '@/lib/util';

export const revalidate = 60;

async function load() {
  try {
    const [i, r] = await Promise.all([
      supabase.from('public_info').select('*').maybeSingle(),
      supabase.from('public_rooms').select('*').order('sort').order('name'),
    ]);
    return { info: i.data || {}, rooms: r.data || [] };
  } catch {
    return { info: {}, rooms: [] };
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

export default async function Home() {
  const { info, rooms } = await load();
  const name = info.name || 'Atha Inn';
  const cur = info.base || 'MVR';
  const wa = info.whatsapp || '9607587079';
  const from = rooms.length ? Math.min(...rooms.map((r) => +r.rate || 0)) : 0;
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

      <section className="section" id="rooms">
        <h2>Rooms</h2>
        <p className="muted">Prices are per room, per night{rooms.length ? '' : ' — rooms will appear here soon'}.</p>
        <div className="rooms-grid">
          {rooms.map((r) => (
            <article className="room-card" key={r.id}>
              <div className="ph">{r.photo ? <img src={r.photo} alt={`Room ${r.name}`} /> : r.type || r.name}</div>
              <div className="bd">
                <h3 style={{ fontSize: 20 }}>{r.type || `Room ${r.name}`}</h3>
                <span className="muted small">Room {r.name} · up to {r.max_guests} guests</span>
                {r.description ? <p style={{ margin: '4px 0' }}>{r.description}</p> : null}
                <div className="row between" style={{ marginTop: 'auto' }}>
                  <span className="price">{cur} {num(r.rate)} <small>/ night</small></span>
                  <Link className="btn pri sm" href={`/book?room=${r.id}`}>Book</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="band-sand" id="about">
        <section className="section">
          <h2>About {name}</h2>
          <p style={{ maxWidth: '42em', fontSize: 18 }}>{info.about}</p>
          <div className="facts" id="contact">
            <div className="fact"><b>Where</b>{info.address}{info.map_url ? <><br /><a href={info.map_url} target="_blank" rel="noopener">Open map</a></> : null}</div>
            <div className="fact"><b>Call</b>{String(info.phones || '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
              <div key={p}><a href={`tel:+960${p.replace(/\D/g, '').slice(-7)}`}>{p}</a></div>))}</div>
            <div className="fact"><b>WhatsApp</b><a href={waLink(wa, `Hello ${name}`)} target="_blank" rel="noopener">Message us</a>{info.email ? <><br /><a href={`mailto:${info.email}`}>{info.email}</a></> : null}</div>
          </div>
        </section>
      </div>

      <footer className="pub-foot">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {name} · {info.address}</span>
          <Link href="/login">Staff login</Link>
        </div>
      </footer>
    </>
  );
}
