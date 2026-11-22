'use client';
import { useEffect } from 'react';

export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Opts = ({ list }) =>
  list.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return <option key={v} value={v}>{l}</option>;
  });

export const Chip = ({ s }) => <span className={`chip ${s[1]}`}>{s[0]}</span>;
