import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_URL_HERE'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_KEY_HERE'

console.log('Supabase URL:', supabaseUrl) // Add this for debugging
console.log('Supabase Key:', supabaseAnonKey ? 'Key exists' : 'NO KEY!') // Add this

export const supabase = createClient(supabaseUrl, supabaseAnonKey)