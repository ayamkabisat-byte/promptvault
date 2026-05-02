import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validasi sederhana untuk memastikan kunci sudah ada di .env.local
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Kunci Supabase belum terpasang di .env.local! Pastikan nama filenya diawali dengan titik (.).")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)