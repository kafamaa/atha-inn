'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { StaffCtx } from '@/lib/staffContext';
import { addD, friendly, today } from '@/lib/util';
import { SHEETS } from '@/components/Sheets';

const EMPTY = { rooms: [], bookings: [], requests: [], bills: [], txns: [], settings: {}, signature: '', staff: [] };

export default function StaffProvider({ children }) {
  const router = useRouter();
  const path = usePathname();
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [stack, setStack] = useState([]);
  const timer = useRef(null);

  const toast = useCallback((m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 3000);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) { router.replace('/login'); return; }
    if (!session) return;
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data: p }) => setProfile((old) => (old && p && old.id === p.id && old.role === p.role ? old : p || null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, session === null]);

  const reload = useCallback(async () => {
    const since = addD(today(), -400);
    const q = await Promise.all([
      supabase.from('rooms').select('*').order('sort').order('name'),
      supabase.from('bookings').select('*').gte('check_out', since).order('check_in'),
      supabase.from('booking_requests').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(2000),
      supabase.from('txns').select('*').gte('date', addD(today(), -800)).order('date', { ascending: false }).limit(5000),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('secrets').select('*').eq('id', 1).maybeSingle(),
      supabase.from('profiles').select('*').order('created_at'),
    ]);
    const bad = q.find((x) => x.error);
    if (bad) toast(friendly(bad.error));
    setData({
      rooms: q[0].data || [], bookings: q[1].data || [], requests: q[2].data || [], bills: q[3].data || [],
      txns: q[4].data || [], settings: q[5].data || {}, signature: q[6].data?.signature || '', staff: q[7].data || [],
    });
    setLoaded(true);
  }, [toast]);

  useEffect(() => { if (profile) reload(); }, [profile, reload]);

  // run a Supabase call: shows errors, reloads data, returns data (or null on error)
  const run = useCallback(async (promise, ok) => {
    const { data: d, error } = await promise;
    if (error) { toast(friendly(error)); return null; }
    if (ok) toast(ok);
    await reload();
    return d ?? true;
  }, [reload, toast]);

  const open = useCallback((type, props = {}) => setStack((s) => [...s, { type, props, key: Date.now() + Math.random() }]), []);
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const replace = useCallback((type, props = {}) => setStack((s) => [...s.slice(0, -1), { type, props, key: Date.now() + Math.random() }]), []);
  const closeAll = useCallback(() => setStack([]), []);
  const confirm = useCallback((text, yes = 'Delete') => new Promise((res) => open('confirm', { text, yes, res })), [open]);

  useEffect(() => { setStack([]); }, [path]);

  if (session === undefined || (session && profile === undefined)) return <div className="empty">Loading…</div>;
  if (!session) return null;
  if (!profile) {
    return (
      <main className="book-wrap"><div className="card">
        <h1 style={{ fontSize: 22 }}>No staff access</h1>
        <p>This account ({session.user.email}) is not set up as staff. Ask the owner to add you in Settings → Staff.</p>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div></main>
    );
  }

  const isAdmin = profile.role === 'admin';
  const newReq = data.requests.filter((r) => r.status === 'new').length;
  const value = { ...data, loaded, profile, isAdmin, reload, run, toast, open, close, replace, closeAll, confirm, session };
  const tabs = [
    ['/staff', 'Today'], ['/staff/bookings', 'Bookings'], ['/staff/requests', 'Requests', newReq],
    ['/staff/rooms', 'Rooms'], ['/staff/bills', 'Bills'],
    ...(isAdmin ? [['/staff/money', 'Money'], ['/staff/settings', 'Settings']] : []),
  ];
  const nav = tabs.map(([h, l, n]) => (
    <Link key={h} href={h} className={path === h ? 'on' : ''}>{l}{n ? <span className="badge">{n}</span> : null}</Link>
  ));
  const top = stack[stack.length - 1];
  const Cmp = top ? SHEETS[top.type] : null;

  return (
    <StaffCtx.Provider value={value}>
      <header className="top">
        <div className="top-in">
          <Link href="/staff" className="brand">
            <img src={data.settings.logo_url || '/logo.png'} alt="" />
            <span><b>{data.settings.name || 'Atha Inn'}</b><small>{profile.name || profile.email} · {isAdmin ? 'Owner' : 'Front desk'}</small></span>
          </Link>
          <Link href="/" className="icon-btn" target="_blank">Website</Link>
          {isAdmin ? <Link href="/staff/settings" className="icon-btn" aria-label="Settings">⚙</Link> : null}
          <button className="icon-btn" onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
        <nav className="tabs">{nav}</nav>
      </header>
      <main className="staff-main">{loaded ? children : <div className="empty">Loading…</div>}</main>
      <nav className="nav-bottom">{nav.slice(0, isAdmin ? 6 : 5)}</nav>
      {Cmp ? <Cmp key={top.key} {...top.props} /> : null}
      {msg ? <div className="toast" role="status">{msg}</div> : null}
    </StaffCtx.Provider>
  );
}
