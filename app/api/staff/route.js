import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const json = (body, status = 200) => Response.json(body, { status });

// Any admin account may manage admin accounts.
async function requireAdmin(req) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server' }, 500) };
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: json({ error: 'Not signed in' }, 401) };
  const sb = adminClient();
  const { data: { user } = {}, error } = await sb.auth.getUser(token);
  if (error || !user) return { error: json({ error: 'Not signed in' }, 401) };
  const { data: p } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!p) return { error: json({ error: 'Only admins can manage accounts' }, 403) };
  return { sb, user };
}

export async function POST(req) {
  const a = await requireAdmin(req);
  if (a.error) return a.error;
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password || String(password).length < 8) return json({ error: 'Email and a password of at least 8 characters are needed' }, 400);
  const { data, error } = await a.sb.auth.admin.createUser({ email: String(email).trim(), password, email_confirm: true, user_metadata: { name } });
  if (error) return json({ error: error.message }, 400);
  const { error: e2 } = await a.sb.from('profiles').upsert({ id: data.user.id, name: name || email, email, role: 'admin' });
  if (e2) return json({ error: e2.message }, 400);
  return json({ ok: true });
}

export async function PATCH(req) {
  const a = await requireAdmin(req);
  if (a.error) return a.error;
  const { id, password } = await req.json().catch(() => ({}));
  if (!id || !password || String(password).length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
  const { error } = await a.sb.auth.admin.updateUserById(id, { password });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}

export async function DELETE(req) {
  const a = await requireAdmin(req);
  if (a.error) return a.error;
  const { id } = await req.json().catch(() => ({}));
  if (!id || id === a.user.id) return json({ error: 'You cannot remove your own account' }, 400);
  const { error } = await a.sb.auth.admin.deleteUser(id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
