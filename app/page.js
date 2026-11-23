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


const ISLAND_GUIDE = [
  { type: 'sights', name: 'Nikamathi', description: 'A peaceful tree deck for relaxing and enjoying the island view.' },
  { type: 'sights', name: 'Bumbaru Deck', description: 'A raised walkway and tree-canopy viewpoint for scenic photos.' },
  { type: 'sights', name: 'Thela Park', description: 'A nature park for a quiet walk and a look at the mangroves.' },
  { type: 'sights', name: 'Kandisaaru', description: 'Explore Kanditheemu\'s cultural heritage centre.' },
  { type: 'sights', name: 'Ameenee Maalam', description: 'Beachfront swings and seating for a relaxed evening.' },
  { type: 'sights', name: 'Beach walks', description: 'Enjoy Kanditheemu\'s shore and local island atmosphere. Follow local swimming guidance.' },
  { type: 'food', name: 'La Olla Bistro', description: 'Local restaurant and café.', phone: '9893949' },
  { type: 'food', name: 'OFI Cafe', description: 'Island café for meals and refreshments.', phone: '7709182' },
  { type: 'food', name: 'Coffee Table', description: 'Local café and restaurant.', phone: '9859440' },
  { type: 'food', name: 'Sol View', description: 'Local café.', phone: '9340929' },
  { type: 'rides', name: 'Roseland Buggy', description: 'Local buggy ride service.', phone: '9850587' },
  { type: 'rides', name: 'Klay Taxi', description: 'Local taxi contact.', phone: '7909007' },
  { type: 'rides', name: 'Buggy Service', description: 'Arrange an island buggy ride.', phone: '9103359' },
  { type: 'rides', name: 'Dhonabe Buggy', description: 'Local buggy service.', phone: '9648270' },
  { type: 'rides', name: 'Avaaz Buggy Rides', description: 'Island transport contact.', phone: '9799785' },
  { type: 'essentials', name: 'Line Watersports', description: 'Ask about canoeing and stand-up paddleboarding.', phone: '9657128' },
  { type: 'essentials', name: 'Line Breeze', description: 'Homemade food contact.', phone: '9657128' },
  { type: 'essentials', name: 'Little Bites', description: 'Homemade food and snacks.', phone: '9822700' },
  { type: 'essentials', name: 'Fine Point', description: 'Local shop and supplies.', phone: '9419406' },
  { type: 'essentials', name: 'Flying Fish', description: 'Ask about inter-island sea transport and schedules.', phone: '7910799' },
];

const GUIDE_GROUPS = [
  { id: 'sights', title: 'Things to see & do', intro: 'Nature, viewpoints, heritage and island experiences.' },
  { id: 'food', title: 'Restaurants & cafés', intro: 'Local places to eat and relax.' },
  { id: 'rides', title: 'Buggy & taxi', intro: 'Contact a local driver to arrange an island ride.' },
  { id: 'essentials', title: 'Food, rentals & useful services', intro: 'Helpful contacts for your stay.' },
];

function IslandGuide({ items }) {
  const entries = Array.isArray(items) ? items.filter((x) => x && x.name && x.type && x.published !== false) : ISLAND_GUIDE;
  return (
    <div className="band-sand" id="discover">
      <section className="section">
        <div className="discover-heading">
          <div><p className="discover-eyebrow">Your island guide</p><h2>Explore Kanditheemu</h2>
            <p className="muted">Discover beautiful places, local food and transport around Sh. Kanditheemu.</p>
          </div>
          <a className="btn" href="https://guide.visitkanditheemu.com/" target="_blank" rel="noopener noreferrer">More island information ↗</a>
        </div>
        <div className="discover-jumps">
          {GUIDE_GROUPS.map((g) => <a key={g.id} href={`#discover-${g.id}`}>{g.title}</a>)}
        </div>
        {GUIDE_GROUPS.map((g) => {
          const list = entries.filter((x) => x.type === g.id);
          return list.length ? (
            <div key={g.id} id={`discover-${g.id}`} className="discover-group">
              <h3>{g.title}</h3><p className="muted">{g.intro}</p>
              <div className="discover-grid">
                {list.map((x, index) => <article key={`${g.id}-${index}`} className="discover-card">
                  {x.photo_url
                    ? <img className="discover-photo" src={x.photo_url} alt={x.name} loading="lazy" />
                    : <div className="discover-icon" aria-hidden="true">{g.id === 'sights' ? '🌴' : g.id === 'food' ? '🍽️' : g.id === 'rides' ? '🛺' : '🧭'}</div>}
                  <div><h4>{x.name}</h4>{x.description ? <p>{x.description}</p> : null}</div>
                  {x.phone ? <a href={`tel:+960${String(x.phone).replace(/\\D/g, '').slice(-7)}`} className="discover-contact">Call {x.phone}</a> : null}
                </article>)}
              </div>
            </div>
          ) : null;
        })}
        <p className="small muted discover-note">Listed contacts are from public island guides. Please confirm operating hours, prices, safety and availability directly with each provider. Services are independently operated unless stated otherwise.</p>
      </section>
    </div>
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

      <IslandGuide items={info.island_guide} />

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
