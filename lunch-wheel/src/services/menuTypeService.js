import { getSupabase } from '../lib/supabase'

const TYPE_SELECT =
  'id, team_id, code, name, icon_key, color, weather_weight_config, is_active, sort_order'

export async function fetchActiveMenuTypes(teamId) {
  const { data, error } = await getSupabase()
    .from('t_menu_type')
    .select(TYPE_SELECT)
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createMenuType({
  teamId,
  code,
  name,
  iconKey,
  color,
  weatherWeightConfig,
  sortOrder,
}) {
  const { data, error } = await getSupabase()
    .from('t_menu_type')
    .insert({
      team_id: teamId,
      code,
      name,
      icon_key: iconKey,
      color,
      weather_weight_config: weatherWeightConfig,
      sort_order: sortOrder,
      is_active: true,
    })
    .select(TYPE_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      const dup = new Error('이미 같은 코드의 타입이 있습니다.')
      dup.code = 'DUPLICATE_CODE'
      throw dup
    }
    throw error
  }
  return data
}

export async function updateMenuType({
  id,
  code,
  name,
  iconKey,
  color,
  weatherWeightConfig,
  sortOrder,
}) {
  const payload = {}
  if (code !== undefined) payload.code = code
  if (name !== undefined) payload.name = name
  if (iconKey !== undefined) payload.icon_key = iconKey
  if (color !== undefined) payload.color = color
  if (weatherWeightConfig !== undefined) {
    payload.weather_weight_config = weatherWeightConfig
  }
  if (sortOrder !== undefined) payload.sort_order = sortOrder

  const { data, error } = await getSupabase()
    .from('t_menu_type')
    .update(payload)
    .eq('id', id)
    .select(TYPE_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      const dup = new Error('이미 같은 코드의 타입이 있습니다.')
      dup.code = 'DUPLICATE_CODE'
      throw dup
    }
    throw error
  }
  return data
}

/** Soft-delete */
export async function deactivateMenuType(id) {
  const { data, error } = await getSupabase()
    .from('t_menu_type')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function countActiveMenusForType(menuTypeId) {
  const { count, error } = await getSupabase()
    .from('t_menu')
    .select('id', { count: 'exact', head: true })
    .eq('menu_type_id', menuTypeId)
    .eq('is_active', true)

  if (error) throw error
  return count ?? 0
}
