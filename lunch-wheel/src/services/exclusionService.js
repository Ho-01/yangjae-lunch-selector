import { getSupabase } from '../lib/supabase'

export async function fetchExclusions(teamId, exclusionDate) {
  const { data, error } = await getSupabase()
    .from('t_daily_menu_exclusion')
    .select('id, team_id, menu_id, exclusion_date')
    .eq('team_id', teamId)
    .eq('exclusion_date', exclusionDate)

  if (error) throw error
  return data ?? []
}

export async function addExclusion({ teamId, menuId, exclusionDate }) {
  const { data, error } = await getSupabase()
    .from('t_daily_menu_exclusion')
    .upsert(
      {
        team_id: teamId,
        menu_id: menuId,
        exclusion_date: exclusionDate,
      },
      { onConflict: 'team_id,menu_id,exclusion_date' },
    )
    .select('id, team_id, menu_id, exclusion_date')
    .single()

  if (error) throw error
  return data
}

export async function removeExclusion({ teamId, menuId, exclusionDate }) {
  const { error } = await getSupabase()
    .from('t_daily_menu_exclusion')
    .delete()
    .eq('team_id', teamId)
    .eq('menu_id', menuId)
    .eq('exclusion_date', exclusionDate)

  if (error) throw error
}

export async function excludeAllMenus({ teamId, menuIds, exclusionDate }) {
  if (!menuIds.length) return []

  const rows = menuIds.map((menuId) => ({
    team_id: teamId,
    menu_id: menuId,
    exclusion_date: exclusionDate,
  }))

  const { data, error } = await getSupabase()
    .from('t_daily_menu_exclusion')
    .upsert(rows, { onConflict: 'team_id,menu_id,exclusion_date' })
    .select('id, team_id, menu_id, exclusion_date')

  if (error) throw error
  return data ?? []
}

export async function clearExclusions({ teamId, exclusionDate }) {
  const { error } = await getSupabase()
    .from('t_daily_menu_exclusion')
    .delete()
    .eq('team_id', teamId)
    .eq('exclusion_date', exclusionDate)

  if (error) throw error
}
