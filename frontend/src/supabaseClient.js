import { createClient } from '@supabase/supabase-js';

// Force the code to look for the REACT_APP_ versions
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Debug: Log to console if missing (so we can see it in the browser)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Supabase Keys are MISSING! Check Vercel Environment Variables.');
  console.log('URL Attempt:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
