export async function searchGooglePlaces({ query, latitude, longitude }) {
  const res = await fetch('/api/places/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, latitude, longitude }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || '장소 검색에 실패했습니다.')
  }
  return data.places || []
}

export async function fetchGooglePlaceDetails(placeId) {
  const params = new URLSearchParams({ placeId })
  const res = await fetch(`/api/places/details?${params.toString()}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || '장소 상세 조회에 실패했습니다.')
  }
  return data.place
}

export function googlePlacePhotoUrl(photoName, maxWidthPx = 320) {
  if (!photoName) return ''
  const params = new URLSearchParams({
    name: photoName,
    maxWidthPx: String(maxWidthPx),
    maxHeightPx: String(maxWidthPx),
  })
  return `/api/places/photo?${params.toString()}`
}

export function getPrimaryGoogleLink(placeLinks = []) {
  return (
    placeLinks.find((link) => link.provider === 'google' && link.is_active) ||
    placeLinks[0] ||
    null
  )
}

/**
 * Nearby Search — call sparingly. Prefer client cache (30m).
 * Does not request photos.
 */
export async function searchNearbyGooglePlaces({
  latitude,
  longitude,
  radiusMeters,
  maxResultCount,
}) {
  const res = await fetch('/api/places/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      radiusMeters,
      maxResultCount,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || '주변 식당 검색에 실패했습니다.')
  }
  return data.places || []
}

/** Map Places results into lunch-wheel menu shape (equal weather weights). */
export function placesToMenus(places) {
  return places.map((place, index) => {
    const category = classifyGooglePlace(place)

    return {
      id: `nearby-${place.placeId}`,
      name: place.placeName,
      sort_order: index + 1,
      food_category: category,
      weather_profile: {
        id: 'nearby-neutral',
        code: 'neutral',
        name: '날씨 영향 없음',
        source: 'default',
        weight_config: { base: 1 },
      },
      category_display: {
        code: category.id,
        name: category.label,
        icon_key: 'utensils',
        color: '#f97316',
      },
      place_links: [
        {
          id: `link-${place.placeId}`,
          provider: 'google',
          url: place.url,
          place_id: place.placeId,
          place_name: place.placeName,
          formatted_address: place.formattedAddress,
          rating: place.rating,
          rating_count: place.ratingCount,
          primary_type: place.primaryType,
          types: place.types || [],
          photo_refs: [],
          is_active: true,
        },
      ],
    }
  })
}
import { classifyGooglePlace } from '../utils/placeCategories.js'
