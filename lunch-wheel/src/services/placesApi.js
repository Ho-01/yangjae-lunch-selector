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
