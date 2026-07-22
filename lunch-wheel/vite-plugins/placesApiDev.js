import {
  fetchPlacePhotoBuffer,
  getGooglePlacesApiKey,
  readJsonBody,
  searchNearbyPlaces,
  searchTextPlaces,
  sendJson,
} from '../api/lib/googlePlaces.js'

function matchPath(url, prefix) {
  return url === prefix || url.startsWith(`${prefix}?`)
}

export function placesApiDevPlugin() {
  return {
    name: 'places-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.method === 'POST' && matchPath(req.url || '', '/api/places/search')) {
            const apiKey = getGooglePlacesApiKey()
            if (!apiKey) {
              return sendJson(res, 500, {
                error: 'GOOGLE_PLACES_API_KEY가 서버에 설정되지 않았습니다.',
              })
            }

            const body = await readJsonBody(req)
            const query = String(body.query || '').trim()
            if (!query) {
              return sendJson(res, 400, { error: '검색어를 입력해주세요.' })
            }

            const latitude = Number(body.latitude)
            const longitude = Number(body.longitude)
            const places = await searchTextPlaces({
              apiKey,
              query,
              latitude: Number.isFinite(latitude) ? latitude : undefined,
              longitude: Number.isFinite(longitude) ? longitude : undefined,
            })
            return sendJson(res, 200, { places })
          }

          if (req.method === 'POST' && matchPath(req.url || '', '/api/places/nearby')) {
            const apiKey = getGooglePlacesApiKey()
            if (!apiKey) {
              return sendJson(res, 500, {
                error: 'GOOGLE_PLACES_API_KEY가 서버에 설정되지 않았습니다.',
              })
            }

            const body = await readJsonBody(req)
            const latitude = Number(body.latitude)
            const longitude = Number(body.longitude)
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              return sendJson(res, 400, { error: '위치 좌표가 필요합니다.' })
            }

            const places = await searchNearbyPlaces({
              apiKey,
              latitude,
              longitude,
              radiusMeters: body.radiusMeters,
              maxResultCount: body.maxResultCount,
            })
            return sendJson(res, 200, {
              places,
              meta: {
                billed: true,
                note: 'Nearby Search 1회 호출입니다. 클라이언트 캐시를 사용하세요.',
              },
            })
          }

          if (req.method === 'GET' && (req.url || '').startsWith('/api/places/photo')) {
            const apiKey = getGooglePlacesApiKey()
            if (!apiKey) {
              return sendJson(res, 500, {
                error: 'GOOGLE_PLACES_API_KEY가 서버에 설정되지 않았습니다.',
              })
            }

            const url = new URL(req.url, 'http://localhost')
            const name = String(url.searchParams.get('name') || '').trim()
            if (!name || !name.startsWith('places/')) {
              return sendJson(res, 400, { error: '유효한 사진 이름이 필요합니다.' })
            }

            const maxWidthPx = Math.min(
              1200,
              Math.max(64, Number(url.searchParams.get('maxWidthPx')) || 400),
            )
            const maxHeightPx = Math.min(
              1200,
              Math.max(64, Number(url.searchParams.get('maxHeightPx')) || 400),
            )

            const { contentType, buffer } = await fetchPlacePhotoBuffer({
              apiKey,
              name,
              maxWidthPx,
              maxHeightPx,
            })

            res.statusCode = 200
            res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.end(buffer)
            return
          }
        } catch (err) {
          console.error('[places-api-dev]', err)
          return sendJson(res, err.status || 500, {
            error: err.message || 'Places API 처리에 실패했습니다.',
          })
        }

        next()
      })
    },
  }
}
