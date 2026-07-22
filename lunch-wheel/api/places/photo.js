import {
  fetchPlacePhotoBuffer,
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
    const name = String(req.query?.name || '').trim()
    if (!name || !name.startsWith('places/')) {
      return res.status(400).json({ error: '유효한 사진 이름이 필요합니다.' })
    }

    const maxWidthPx = Math.min(
      1200,
      Math.max(64, Number(req.query?.maxWidthPx) || 400),
    )
    const maxHeightPx = Math.min(
      1200,
      Math.max(64, Number(req.query?.maxHeightPx) || 400),
    )

    const { contentType, buffer } = await fetchPlacePhotoBuffer({
      apiKey,
      name,
      maxWidthPx,
      maxHeightPx,
    })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).send(buffer)
  } catch (err) {
    console.error(err)
    return res.status(err.status || 500).json({
      error: err.message || '사진 조회에 실패했습니다.',
    })
  }
}
