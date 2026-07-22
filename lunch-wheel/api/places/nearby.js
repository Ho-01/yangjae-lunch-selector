import {
  getGooglePlacesApiKey,
  searchNearbyPlaces,
} from '../lib/googlePlaces.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = getGooglePlacesApiKey()
  if (!apiKey) {
    return res.status(500).json({
      error: 'GOOGLE_PLACES_API_KEY가 서버에 설정되지 않았습니다.',
    })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: '위치 좌표가 필요합니다.' })
    }

    const places = await searchNearbyPlaces({
      apiKey,
      latitude,
      longitude,
      radiusMeters: body.radiusMeters,
      maxResultCount: body.maxResultCount,
    })

    return res.status(200).json({
      places,
      meta: {
        billed: true,
        note: 'Nearby Search 1회 호출입니다. 클라이언트 캐시를 사용하세요.',
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(err.status || 500).json({
      error: err.message || '주변 식당 검색에 실패했습니다.',
    })
  }
}
