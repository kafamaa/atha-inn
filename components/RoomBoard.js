'use client';
import { useStaff } from '@/lib/staffContext';
import { dS, nights, roomState } from '@/lib/util';

export const Legend = () => (
  <div className="legend">
    <span><i className="s-ready" style={{ background: 'var(--ok)' }} />Available</span>
    <span><i style={{ background: 'var(--occ)' }} />Occupied</span>
    <span><i style={{ background: 'var(--blue)' }} />Reserved / arriving</span>
    <span><i style={{ background: 'var(--warn)' }} />Cleaning</span>
    <span><i style={{ background: 'var(--bad)' }} />Maintenance</span>
  </div>
);

export function RoomBoard() {
  const { rooms, bookings, open } = useStaff();
  return (
    <div className="board">
      {rooms.map((r) => {
        const s = roomState(r, bookings);
        return (
          <button key={r.id} className={`tile s-${s.k}`} onClick={() => open('room', { id: r.id })}>
            <span className="rn">{r.name}</span><span className="st">{s.lab}</span>
            {s.b ? <><span className="gu">{s.b.guest}</span><span className="sub">{s.k === 'occ' ? `until ${dS(s.b.check_out)}` : `${nights(s.b.check_in, s.b.check_out)} nights`}</span></>
              : <span className="sub">{r.type}</span>}
          </button>
        );
      })}
    </div>
  );
}

