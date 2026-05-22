import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  console.log('✅ Supabase client initialized');
  console.log('URL:', supabaseUrl);
  console.log('Key exists:', !!supabaseKey);
}