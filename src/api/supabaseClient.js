import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../assets/variables';

// Single shared Supabase client. Uses the publishable (anon) key; the app does
// not use Supabase Auth (login is a custom users table), so we disable session
// persistence to avoid unused auth state.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
