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
