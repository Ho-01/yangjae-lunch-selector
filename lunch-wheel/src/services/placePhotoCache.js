import {
  PLACE_CACHE_MAX_PHOTOS,
  PLACE_LINK_REFRESH_MS,
  PLACE_PHOTO_BUCKET,
} from '../constants/app'
import { getSupabase } from '../lib/supabase'
import { updatePlaceLinkCache } from './placeLinkService'
import { fetchGooglePlaceDetails, googlePlacePhotoUrl } from './placesApi'

export function isPlaceLinkStale(fetchedAt) {
  if (!fetchedAt) return true
  const ts = new Date(fetchedAt).getTime()
  if (!Number.isFinite(ts)) return true
  return Date.now() - ts > PLACE_LINK_REFRESH_MS
}

export function needsPhotoCache(link) {
  if (!link || link.provider !== 'google') return false
  const refs = Array.isArray(link.photo_refs) ? link.photo_refs : []
  const urls = Array.isArray(link.photo_urls) ? link.photo_urls : []
  return refs.length > 0 && urls.length === 0
}

export function shouldRefreshPlaceLink(link) {
  if (!link || link.provider !== 'google' || !link.place_id) return false
  return isPlaceLinkStale(link.fetched_at) || needsPhotoCache(link)
}

/** Prefer Storage URLs; fall back to live Google proxy only if not cached yet. */
export function getPlacePhotoSrcs(link, limit = PLACE_CACHE_MAX_PHOTOS) {
  if (!link) return []
  const cached = Array.isArray(link.photo_urls)
    ? link.photo_urls.filter(Boolean)
    : []
  if (cached.length) return cached.slice(0, limit)

  const refs = Array.isArray(link.photo_refs) ? link.photo_refs : []
  return refs.slice(0, limit).map((photo) => googlePlacePhotoUrl(photo.name, 320))
}

async function uploadPhotoBlob({ teamId, menuId, linkId, index, blob, contentType }) {
  const ext = contentType?.includes('png')
    ? 'png'
    : contentType?.includes('webp')
      ? 'webp'
      : 'jpg'
  const path = `${teamId}/${menuId}/${linkId}_${index}.${ext}`
  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from(PLACE_PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: contentType || 'image/jpeg',
      upsert: true,
      cacheControl: '604800',
    })

  if (error) throw error

  const { data } = supabase.storage.from(PLACE_PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function cachePhotoRefsToStorage(link, photoRefs) {
  const refs = (photoRefs || []).slice(0, PLACE_CACHE_MAX_PHOTOS)
  const urls = []

  for (let i = 0; i < refs.length; i += 1) {
    const ref = refs[i]
    if (!ref?.name) continue
    const res = await fetch(googlePlacePhotoUrl(ref.name, 800))
    if (!res.ok) continue
    const blob = await res.blob()
    const publicUrl = await uploadPhotoBlob({
      teamId: link.team_id,
      menuId: link.menu_id,
      linkId: link.id,
      index: i,
      blob,
      contentType: blob.type || 'image/jpeg',
    })
    urls.push(publicUrl)
  }

  return urls
}

/**
 * After first connect: download Google photos once into Supabase Storage.
 */
export async function cachePlacePhotosForLink(link, photoRefs) {
  if (!link?.id) return link
  const refs = photoRefs || link.photo_refs || []
  if (!refs.length) {
    return updatePlaceLinkCache(link.id, {
      photo_urls: [],
      fetch_status: 'ok',
    })
  }

  try {
    const photoUrls = await cachePhotoRefsToStorage(link, refs)
    return updatePlaceLinkCache(link.id, {
      photo_refs: refs,
      photo_urls: photoUrls,
      fetch_status: 'ok',
    })
  } catch (err) {
    console.error(err)
    return updatePlaceLinkCache(link.id, {
      fetch_status: 'failed',
    })
  }
}

/**
 * Weekly refresh: Place Details (rating/photos meta) + re-cache photos to Storage.
 */
export async function refreshPlaceLink(link) {
  if (!link?.place_id) return link

  const place = await fetchGooglePlaceDetails(link.place_id)
  const photoRefs = place.photoRefs || []
  let photoUrls = []

  try {
    photoUrls = await cachePhotoRefsToStorage(link, photoRefs)
  } catch (err) {
    console.error(err)
  }

  return updatePlaceLinkCache(link.id, {
    url: place.url,
    place_name: place.placeName,
    formatted_address: place.formattedAddress,
    phone: place.phone || null,
    latitude: place.latitude,
    longitude: place.longitude,
    rating: place.rating,
    rating_count: place.ratingCount,
    photo_refs: photoRefs,
    photo_urls: photoUrls,
    fetch_status: photoUrls.length || !photoRefs.length ? 'ok' : 'failed',
  })
}

export async function refreshStalePlaceLinks(links, { onUpdated } = {}) {
  const targets = (links || []).filter(shouldRefreshPlaceLink)
  const updated = []

  for (const link of targets) {
    try {
      let next
      if (needsPhotoCache(link) && !isPlaceLinkStale(link.fetched_at)) {
        next = await cachePlacePhotosForLink(link, link.photo_refs)
      } else {
        next = await refreshPlaceLink(link)
      }
      updated.push(next)
      onUpdated?.(next)
    } catch (err) {
      console.error('place link refresh failed', link.id, err)
    }
  }

  return updated
}
