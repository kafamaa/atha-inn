'use client';
import { useStaff } from '@/lib/staffContext';

export default function StaffPage() {
  const { staff, isAdmin, open } = useStaff();

  return (
    <>
      <div className="pagehead">
        <h1>Staff</h1>
        {isAdmin ? <button className="btn coral" onClick={() => open('staffForm')}>+ Add staff</button> : null}
      </div>

      <div className="grid g2">
        {staff.length ? (
          staff.map((s) => (
            <div key={s.id} className="card">
              <div className="ph" style={{ height: 200, background: `url(${s.photo}) center/cover` }} />
              <h3 style={{ marginTop: 12 }}>{s.name}</h3>
              <p className="muted small">{s.role}</p>
              {s.bio ? <p style={{ margin: '8px 0 0', fontSize: 14 }}>{s.bio}</p> : null}
              <div className="row" style={{ marginTop: 12, gap: 6 }}>
                {isAdmin ? (
                  <>
                    <button className="btn sm" onClick={() => open('staffForm', { id: s.id })}>Edit</button>
                    <button className="btn sm danger" onClick={() => open('staffForm', { id: s.id, delete: true })}>Delete</button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>No staff members yet</div>
        )}
      </div>
    </>
  );
}
