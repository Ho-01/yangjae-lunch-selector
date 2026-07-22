import { getSupabase } from '../lib/supabase'

function mapLink(row) {
  return {
    id: row.id,
    team_id: row.team_id,
    menu_id: row.menu_id,
    provider: row.provider,
    url: row.url,
    place_id: row.place_id,
    place_name: row.place_name,
    formatted_address: row.formatted_address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating,
    rating_count: row.rating_count,
    photo_refs: row.photo_refs || [],
    photo_urls: row.photo_urls || [],
    fetch_status: row.fetch_status,
    fetched_at: row.fetched_at,
    sort_order: row.sort_order,
    is_active: row.is_active,
  }
}

export async function fetchPlaceLinks(teamId) {
  const { data, error } = await getSupabase()
    .from('t_menu_place_link')
    .select(
      `
      id,
      team_id,
      menu_id,
      provider,
      url,
      place_id,
      place_name,
      formatted_address,
      phone,
      latitude,
      longitude,
      rating,
      rating_count,
      photo_refs,
      photo_urls,
      fetch_status,
      fetched_at,
      sort_order,
      is_active
    `,
    )
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapLink)
}

export async function upsertGooglePlaceLink({ teamId, menuId, place }) {
  const { error: deactivateError } = await getSupabase()
    .from('t_menu_place_link')
    .update({ is_active: false })
    .eq('menu_id', menuId)
    .eq('provider', 'google')
    .eq('is_active', true)

  if (deactivateError) throw deactivateError

  const { data, error } = await getSupabase()
    .from('t_menu_place_link')
    .insert({
      team_id: teamId,
      menu_id: menuId,
      provider: 'google',
      url: place.url,
      place_id: place.placeId,
      place_name: place.placeName,
      formatted_address: place.formattedAddress,
      phone: place.phone || null,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      rating_count: place.ratingCount,
      photo_refs: place.photoRefs || [],
      photo_urls: [],
      fetch_status: 'ok',
      fetched_at: new Date().toISOString(),
      sort_order: 0,
      is_active: true,
    })
    .select(
      `
      id,
      team_id,
      menu_id,
      provider,
      url,
      place_id,
      place_name,
      formatted_address,
      phone,
      latitude,
      longitude,
      rating,
      rating_count,
      photo_refs,
      photo_urls,
      fetch_status,
      fetched_at,
      sort_order,
      is_active
    `,
    )
    .single()

  if (error) throw error
  return mapLink(data)
}

export async function deactivatePlaceLink(id) {
  const { error } = await getSupabase()
    .from('t_menu_place_link')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function deactivateGoogleLinksForMenu(menuId) {
  const { error } = await getSupabase()
    .from('t_menu_place_link')
    .update({ is_active: false })
    .eq('menu_id', menuId)
    .eq('provider', 'google')
    .eq('is_active', true)

  if (error) throw error
}
