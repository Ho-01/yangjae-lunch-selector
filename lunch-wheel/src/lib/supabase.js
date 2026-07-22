import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }
  return createBrowserClient(supabaseUrl, supabaseKey)
}

let client

export function getSupabase() {
  if (!client) {
    client = createClient()
  }
  return client
}
