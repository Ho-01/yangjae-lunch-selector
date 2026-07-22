import { getSupabase } from '../lib/supabase'

export async function fetchActiveMenuTypes(teamId) {
  const { data, error } = await getSupabase()
    .from('t_menu_type')
    .select(
      'id, team_id, code, name, icon_key, color, weather_weight_config, is_active, sort_order',
    )
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}
