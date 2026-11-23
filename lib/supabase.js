import { createClient } from '@supabase/supabase-js';

// Both publishable and legacy anon keys are safe for browser use.
// Never expose the service-role key in client-side code.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and a publishable or anon key');
}

export const supabase = createClient(url, key);
