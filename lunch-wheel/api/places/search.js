import {
  getGooglePlacesApiKey,
  searchTextPlaces,
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
    const query = String(body.query || '').trim()
    if (!query) {
      return res.status(400).json({ error: '검색어를 입력해주세요.' })
    }

    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    const places = await searchTextPlaces({
      apiKey,
      query,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
    })

    return res.status(200).json({ places })
  } catch (err) {
    console.error(err)
    return res.status(err.status || 500).json({
      error: err.message || '장소 검색에 실패했습니다.',
    })
  }
}
