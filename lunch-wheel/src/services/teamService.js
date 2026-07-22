import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { TEAM_SLUG } from '../constants/app'

export async function fetchActiveTeamBySlug(slug = TEAM_SLUG) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 연결 정보가 없습니다. 환경변수를 확인해주세요.')
  }

  const { data, error } = await getSupabase()
    .from('t_team')
    .select(
      'id, name, slug, location_name, weather_latitude, weather_longitude, timezone, is_active',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error(`활성 팀(${slug})을 찾을 수 없습니다.`)
  return data
}
