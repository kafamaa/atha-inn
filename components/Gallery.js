'use client';
import { useEffect, useState } from 'react';

export default function Gallery({ items }) {
  const [i, setI] = useState(-1);
  const cur = items[i];
  useEffect(() => {
    if (i < 0) return;
    const k = (e) => {
      if (e.key === 'Escape') setI(-1);
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % items.length);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [i, items.length]);
  return (
    <>
      <div className="gallery">
        {items.map((g, k) => (
          <button key={g.id} onClick={() => setI(k)} aria-label={g.caption || (g.kind === 'video' ? 'Play video' : 'Open photo')}>
            {g.kind === 'video' ? <><video src={g.url} muted playsInline preload="metadata" /><span className="play">▶</span></> : <img src={g.url} alt={g.caption || ''} loading="lazy" />}
            {g.caption ? <span className="cap">{g.caption}</span> : null}
          </button>
        ))}
      </div>
      {cur ? (
        <div className="lightbox" onClick={(e) => { if (e.target === e.currentTarget) setI(-1); }} role="dialog" aria-modal="true">
          <div style={{ textAlign: 'center' }}>
            {cur.kind === 'video' ? <video src={cur.url} controls autoPlay playsInline /> : <img src={cur.url} alt={cur.caption || ''} />}
            {cur.caption ? <p>{cur.caption}</p> : null}
          </div>
          <button className="btn x" onClick={() => setI(-1)} aria-label="Close">✕</button>
          {items.length > 1 ? <>
            <button className="btn nav prev" onClick={() => setI((i - 1 + items.length) % items.length)} aria-label="Previous">‹</button>
            <button className="btn nav next" onClick={() => setI((i + 1) % items.length)} aria-label="Next">›</button>
          </> : null}
        </div>
      ) : null}
    </>
  );
}
