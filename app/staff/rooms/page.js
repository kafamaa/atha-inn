'use client';
import { useStaff } from '@/lib/staffContext';
import { supabase } from '@/lib/supabase';
import { money, roomState } from '@/lib/util';

export default function Rooms() {
  const { rooms, bookings, settings, isAdmin, open, run } = useStaff();
  async function quickSetup(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const n = Math.min(60, Math.max(1, +f.n || 1));
    const rows = [...Array(n)].map((_, i) => ({ name: String(101 + i), type: f.type, rate: +f.rate || 0, max_guests: 2, sort: i }));
    await run(supabase.from('rooms').insert(rows), `${n} rooms created — tap one to edit`);
  }
  return (
    <>
      <div className="pagehead"><h1>Rooms</h1>{isAdmin ? <button className="btn coral" onClick={() => open('roomForm')}>+ Add room</button> : null}</div>
      {rooms.length ? (
        <div className="card"><div className="list">
          {rooms.map((r) => {
            const s = roomState(r, bookings);
            return (
              <button key={r.id} className="item" onClick={() => open('room', { id: r.id })}>
                {r.photo ? <img src={r.photo} alt="" style={{ width: 56, height: 44, objectFit: 'cover', borderRadius: 8 }} /> : null}
                <div className="grow"><b>{r.name}</b><span className="small muted">{r.type}{r.max_guests ? ` · ${r.max_guests} guests` : ''}{r.is_public ? '' : ' · hidden from website'}</span></div>
                <div className="amt">{money(r.rate, settings.base)}<span className="small muted"> /night</span><br /><span className={`chip s-${s.k}`}>{s.lab}</span></div>
              </button>
            );
          })}
        </div></div>
      ) : isAdmin ? (
        <form className="card" style={{ maxWidth: 560 }} onSubmit={quickSetup}>
          <h2>Quick setup</h2>
          <p className="muted">Create your rooms in one go. You can rename them, add photos and change prices afterwards.</p>
          <div className="fg">
            <label>How many rooms?<input name="n" type="number" min="1" max="60" defaultValue="6" required /></label>
            <label>Price per night ({settings.base})<input name="rate" type="number" min="0" step="0.01" defaultValue="450" /></label>
            <label>Room type<input name="type" defaultValue="Double room" /></label>
          </div>
          <div className="actions"><button className="btn pri">Create rooms</button></div>
        </form>
      ) : <div className="card empty">The owner has not added rooms yet</div>}
    </>
  );
}
