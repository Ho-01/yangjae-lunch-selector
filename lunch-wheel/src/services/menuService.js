import { getSupabase } from '../lib/supabase'

function mapMenuRow(row) {
  return {
    id: row.id,
    team_id: row.team_id,
    name: row.name,
    sort_order: row.sort_order,
    is_active: row.is_active,
    menu_type_id: row.menu_type_id,
    menu_type: row.t_menu_type
      ? {
          id: row.t_menu_type.id,
          code: row.t_menu_type.code,
          name: row.t_menu_type.name,
          icon_key: row.t_menu_type.icon_key,
          color: row.t_menu_type.color,
          weather_weight_config: row.t_menu_type.weather_weight_config,
        }
      : null,
  }
}

export async function fetchActiveMenus(teamId) {
  const { data, error } = await getSupabase()
    .from('t_menu')
    .select(
      `
      id,
      team_id,
      menu_type_id,
      name,
      is_active,
      sort_order,
      t_menu_type (
        id,
        code,
        name,
        icon_key,
        color,
        weather_weight_config
      )
    `,
    )
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapMenuRow)
}

export async function createMenu({ teamId, name, menuTypeId, sortOrder }) {
  const { data, error } = await getSupabase()
    .from('t_menu')
    .insert({
      team_id: teamId,
      name,
      menu_type_id: menuTypeId,
      sort_order: sortOrder,
      is_active: true,
    })
    .select(
      `
      id,
      team_id,
      menu_type_id,
      name,
      is_active,
      sort_order,
      t_menu_type (
        id,
        code,
        name,
        icon_key,
        color,
        weather_weight_config
      )
    `,
    )
    .single()

  if (error) {
    if (error.code === '23505') {
      const dup = new Error('이미 같은 이름의 메뉴가 있습니다.')
      dup.code = 'DUPLICATE_NAME'
      throw dup
    }
    throw error
  }
  return mapMenuRow(data)
}

export async function updateMenu({ id, name, menuTypeId, sortOrder }) {
  const payload = {}
  if (name !== undefined) payload.name = name
  if (menuTypeId !== undefined) payload.menu_type_id = menuTypeId
  if (sortOrder !== undefined) payload.sort_order = sortOrder

  const { data, error } = await getSupabase()
    .from('t_menu')
    .update(payload)
    .eq('id', id)
    .select(
      `
      id,
      team_id,
      menu_type_id,
      name,
      is_active,
      sort_order,
      t_menu_type (
        id,
        code,
        name,
        icon_key,
        color,
        weather_weight_config
      )
    `,
    )
    .single()

  if (error) {
    if (error.code === '23505') {
      const dup = new Error('이미 같은 이름의 메뉴가 있습니다.')
      dup.code = 'DUPLICATE_NAME'
      throw dup
    }
    throw error
  }
  return mapMenuRow(data)
}

/** Soft-delete: is_active = false */
export async function deactivateMenu(id) {
  const { data, error } = await getSupabase()
    .from('t_menu')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .single()

  if (error) throw error
  return data
}

/** Hard delete — not used by default UI */
export async function deleteMenuPermanently(id) {
  const { error } = await getSupabase().from('t_menu').delete().eq('id', id)
  if (error) throw error
}
