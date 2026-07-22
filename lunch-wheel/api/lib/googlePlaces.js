const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'places.googleMapsUri',
  'places.nationalPhoneNumber',
].join(',')

/** Nearby: no photos — avoids photo media costs and keeps the payload small */
const NEARBY_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryType',
].join(',')

export function getGooglePlacesApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY || ''
}

export function mapGooglePlace(place) {
  const resourceName = place.id || ''
  const placeId = resourceName.startsWith('places/')
    ? resourceName.slice('places/'.length)
    : resourceName

  const photoRefs = (place.photos || []).slice(0, 6).map((photo) => ({
    name: photo.name,
    widthPx: photo.widthPx ?? null,
    heightPx: photo.heightPx ?? null,
  }))

  return {
    placeId,
    resourceName,
    placeName: place.displayName?.text || '',
    formattedAddress: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || '',
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    primaryType: place.primaryType || null,
    url:
      place.googleMapsUri ||
      (placeId
        ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
        : null),
    photoRefs,
  }
}

export async function searchTextPlaces({
  apiKey,
  query,
  latitude,
  longitude,
  radiusMeters = 3000,
}) {
  const body = {
    textQuery: query,
    languageCode: 'ko',
    pageSize: 8,
  }

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    body.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: radiusMeters,
      },
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message || `Places 검색 실패 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return (data.places || []).map(mapGooglePlace)
}

export async function searchNearbyPlaces({
  apiKey,
  latitude,
  longitude,
  radiusMeters = 1000,
  maxResultCount = 15,
}) {
  const radius = Math.min(5000, Math.max(100, Number(radiusMeters) || 1000))
  const count = Math.min(20, Math.max(1, Number(maxResultCount) || 15))

  const body = {
    includedPrimaryTypes: ['restaurant'],
    maxResultCount: count,
    rankPreference: 'DISTANCE',
    languageCode: 'ko',
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius,
      },
    },
  }

  const res = await fetch(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': NEARBY_FIELD_MASK,
      },
      body: JSON.stringify(body),
    },
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message || `주변 검색 실패 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return (data.places || []).map(mapGooglePlace)
}

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'photos',
  'googleMapsUri',
  'nationalPhoneNumber',
  'primaryType',
].join(',')

export async function fetchPlaceDetails({ apiKey, placeId }) {
  const id = String(placeId || '').replace(/^places\//, '')
  if (!id) {
    throw new Error('placeId가 필요합니다.')
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    },
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message || `장소 상세 조회 실패 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return mapGooglePlace(data)
}

export async function fetchPlacePhotoBuffer({
  apiKey,
  name,
  maxWidthPx = 400,
  maxHeightPx = 400,
}) {
  const params = new URLSearchParams({
    maxWidthPx: String(maxWidthPx),
    maxHeightPx: String(maxHeightPx),
    key: apiKey,
  })

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?${params.toString()}`,
    { redirect: 'follow' },
  )

  if (!res.ok) {
    const error = new Error(`사진 조회 실패 (${res.status})`)
    error.status = res.status
    throw error
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await res.arrayBuffer())
  return { contentType, buffer }
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
