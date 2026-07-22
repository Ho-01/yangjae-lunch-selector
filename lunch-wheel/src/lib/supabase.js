import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const AUDIT_CLIENT_ID_KEY = 'lunch-wheel-audit-client-id'

function getAuditClientId() {
  try {
    const existing = window.localStorage.getItem(AUDIT_CLIENT_ID_KEY)
    if (existing) return existing

    const id = window.crypto.randomUUID()
    window.localStorage.setItem(AUDIT_CLIENT_ID_KEY, id)
    return id
  } catch {
    return undefined
  }
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }
  const auditClientId = getAuditClientId()

  return createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      headers: auditClientId ? { 'x-client-id': auditClientId } : {},
    },
  })
}

let client

export function getSupabase() {
  if (!client) {
    client = createClient()
  }
  return client
}
