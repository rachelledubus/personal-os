import { createClient } from '@supabase/supabase-js';

// Same Supabase project as V1. The anon key is safe to expose client-side
// (that's what it's designed for) — real protection is Row Level Security,
// defined in your existing schema.sql plus migrations/v2_missions_layer.sql.
//
// Pulled from Vite env vars so the key isn't hardcoded in source. Set these
// in Netlify: Site settings → Environment variables.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
