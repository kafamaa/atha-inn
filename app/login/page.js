'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
    setBusy(false);
    if (error) return setErr('Wrong email or password');
    router.replace('/staff');
  }
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--lagbg)' }}>
      <form className="card" style={{ width: 'min(400px,100%)' }} onSubmit={submit}>
        <div className="row" style={{ marginBottom: 14 }}>
          <img src="/logo.png" alt="" width="52" height="52" style={{ borderRadius: '50%' }} />
          <div><h1 style={{ fontSize: 22 }}>Staff login</h1><span className="muted small">Atha Inn</span></div>
        </div>
        <div className="grid">
          <label>Email<input name="email" type="email" required autoComplete="username" /></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
          {err ? <p className="out" style={{ margin: 0 }}>{err}</p> : null}
          <button className="btn pri" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="small muted" style={{ margin: 0 }}>Forgot your password? Ask the owner to reset it.</p>
        </div>
      </form>
    </main>
  );
}
