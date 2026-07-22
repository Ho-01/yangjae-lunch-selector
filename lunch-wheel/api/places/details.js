import {
  fetchPlaceDetails,
  getGooglePlacesApiKey,
} from '../lib/googlePlaces.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = getGooglePlacesApiKey()
  if (!apiKey) {
    return res.status(500).json({
      error: 'GOOGLE_PLACES_API_KEY가 서버에 설정되지 않았습니다.',
    })
  }

  try {
    const placeId = String(req.query?.placeId || '').trim()
    if (!placeId) {
      return res.status(400).json({ error: 'placeId가 필요합니다.' })
    }

    const place = await fetchPlaceDetails({ apiKey, placeId })
    return res.status(200).json({ place })
  } catch (err) {
    console.error(err)
    return res.status(err.status || 500).json({
      error: err.message || '장소 상세 조회에 실패했습니다.',
    })
  }
}
