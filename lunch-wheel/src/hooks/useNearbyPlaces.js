import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  NEARBY_CACHE_KEY,
  NEARBY_CACHE_TTL_MS,
  NEARBY_MAX_RESULTS,
  NEARBY_SETTINGS_KEY,
} from '../constants/app'
import {
  placesToMenus,
  searchNearbyGooglePlaces,
} from '../services/placesApi'

const DEFAULT_SETTINGS = {
  radiusMeters: 1000,
  minRating: 3.5,
}

function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(NEARBY_SETTINGS_KEY))
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
    return {
      radiusMeters: Number(raw.radiusMeters) || DEFAULT_SETTINGS.radiusMeters,
      minRating: Number.isFinite(Number(raw.minRating))
        ? Number(raw.minRating)
        : DEFAULT_SETTINGS.minRating,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeSettings(settings) {
  localStorage.setItem(NEARBY_SETTINGS_KEY, JSON.stringify(settings))
}

function roundCoord(value) {
  return Math.round(Number(value) * 1000) / 1000
}

function cacheKeyParts({ latitude, longitude, radiusMeters }) {
  return {
    lat: roundCoord(latitude),
    lng: roundCoord(longitude),
    radiusMeters: Number(radiusMeters),
  }
}

function readCache(parts) {
  try {
    const raw = JSON.parse(localStorage.getItem(NEARBY_CACHE_KEY))
    if (!raw?.savedAt || !Array.isArray(raw.places)) return null
    if (Date.now() - raw.savedAt > NEARBY_CACHE_TTL_MS) return null
    if (
      raw.lat !== parts.lat ||
      raw.lng !== parts.lng ||
      raw.radiusMeters !== parts.radiusMeters
    ) {
      return null
    }
    return raw
  } catch {
    return null
  }
}

function writeCache(parts, places) {
  localStorage.setItem(
    NEARBY_CACHE_KEY,
    JSON.stringify({
      ...parts,
      places,
      savedAt: Date.now(),
    }),
  )
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.'))
        } else {
          reject(new Error('위치를 가져오지 못했습니다.'))
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    )
  })
}

function filterByRating(places, minRating) {
  if (!minRating) return places
  return places.filter(
    (place) => place.rating != null && Number(place.rating) >= minRating,
  )
}

export function useNearbyPlaces() {
  const [settings, setSettingsState] = useState(readSettings)
  const [coords, setCoords] = useState(null)
  const [rawPlaces, setRawPlaces] = useState([])
  const [excludedIds, setExcludedIds] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [apiCallsThisSession, setApiCallsThisSession] = useState(0)

  useEffect(() => {
    writeSettings(settings)
  }, [settings])

  const setSettings = useCallback((patch) => {
    setSettingsState((prev) => ({ ...prev, ...patch }))
  }, [])

  const filteredPlaces = useMemo(
    () => filterByRating(rawPlaces, settings.minRating),
    [rawPlaces, settings.minRating],
  )

  const menus = useMemo(() => placesToMenus(filteredPlaces), [filteredPlaces])

  const weatherLocation = useMemo(() => {
    if (!coords) return null
    return {
      location_name: '내 위치',
      weather_latitude: coords.latitude,
      weather_longitude: coords.longitude,
      timezone: 'Asia/Seoul',
    }
  }, [coords])

  const loadNearby = useCallback(
    async ({ force = false } = {}) => {
      setLoading(true)
      setError(null)
      try {
        const position = await getCurrentPosition()
        setCoords(position)

        const parts = cacheKeyParts({
          latitude: position.latitude,
          longitude: position.longitude,
          radiusMeters: settings.radiusMeters,
        })

        if (!force) {
          const cached = readCache(parts)
          if (cached) {
            setRawPlaces(cached.places)
            setFromCache(true)
            setFetchedAt(cached.savedAt)
            setExcludedIds(new Set())
            return { places: cached.places, fromCache: true }
          }
        }

        const places = await searchNearbyGooglePlaces({
          latitude: position.latitude,
          longitude: position.longitude,
          radiusMeters: settings.radiusMeters,
          maxResultCount: NEARBY_MAX_RESULTS,
        })

        writeCache(parts, places)
        setRawPlaces(places)
        setFromCache(false)
        setFetchedAt(Date.now())
        setExcludedIds(new Set())
        setApiCallsThisSession((n) => n + 1)
        return { places, fromCache: false }
      } catch (err) {
        console.error(err)
        setError(err?.message || '주변 식당을 불러오지 못했습니다.')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [settings.radiusMeters],
  )

  const clearCache = useCallback(() => {
    localStorage.removeItem(NEARBY_CACHE_KEY)
    setFromCache(false)
  }, [])

  return {
    settings,
    setSettings,
    coords,
    menus,
    rawPlaces,
    filteredPlaces,
    excludedIds,
    setExcludedIds,
    loading,
    error,
    fromCache,
    fetchedAt,
    apiCallsThisSession,
    weatherLocation,
    loadNearby,
    clearCache,
  }
}
