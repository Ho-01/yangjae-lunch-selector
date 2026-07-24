import { supabaseBackend } from './adapters/supabase'

const provider = import.meta.env.VITE_BACKEND_PROVIDER || 'supabase'

const providers = {
  supabase: supabaseBackend,
}

if (!providers[provider]) {
  throw new Error(
    `지원하지 않는 백엔드 제공자입니다: ${provider}. VITE_BACKEND_PROVIDER를 확인해주세요.`,
  )
}

/**
 * 화면과 훅이 의존하는 유일한 백엔드 조립점.
 * Spring 전환 시 같은 계약의 springBackend를 providers에 추가한다.
 */
export const backend = providers[provider]
export const backendProvider = provider
