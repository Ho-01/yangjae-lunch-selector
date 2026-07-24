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
import { PLACE_CATEGORY_DEFINITIONS } from '../constants/placeCategories'
import { classifyGooglePlace } from '../utils/placeCategories'

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

function formatCoord(value) {
  return Number(value).toFixed(5)
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
    if (!window.isSecureContext) {
      reject(
        new Error(
          '현재 접속 환경에서는 위치를 확인할 수 없습니다. 안전한 주소로 다시 접속해주세요.',
        ),
      )
      return
    }

    if (!navigator.geolocation) {
      reject(new Error('현재 기기에서는 위치를 확인할 수 없습니다. 직접 고르는 모드를 이용해주세요.'))
      return
    }

    const onSuccess = (pos) => {
      resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      })
    }

    const explainError = (err) => {
      if (err?.code === 1 || err?.code === err?.PERMISSION_DENIED) {
        return '위치 권한이 꺼져 있습니다. 이 사이트의 위치 권한을 허용한 뒤 다시 시도해주세요.'
      }
      if (err?.code === 3 || err?.code === err?.TIMEOUT) {
        return '위치 확인 시간이 초과되었습니다. Wi-Fi/GPS를 켠 뒤 다시 시도해주세요.'
      }
      if (err?.code === 2 || err?.code === err?.POSITION_UNAVAILABLE) {
        return '기기에서 위치를 확인할 수 없습니다. Windows 설정 → 개인 정보 보호 → 위치 서비스가 켜져 있는지 확인해주세요.'
      }
      return `위치를 가져오지 못했습니다${err?.message ? ` (${err.message})` : ''}.`
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (firstErr) => {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (secondErr) => reject(new Error(explainError(secondErr || firstErr))),
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          },
        )
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 5 * 60_000,
      },
    )
  })
}

async function reverseGeocodeLabel(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'ko',
    })
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const parts = [
      data.locality || data.city,
      data.principalSubdivision,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : data.countryName || null
  } catch {
    return null
  }
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
  const [locationLabel, setLocationLabel] = useState('')
  const [locatedAt, setLocatedAt] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)

  const [rawPlaces, setRawPlaces] = useState([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
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

  const ratingFilteredPlaces = useMemo(
    () => filterByRating(rawPlaces, settings.minRating),
    [rawPlaces, settings.minRating],
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map(
      PLACE_CATEGORY_DEFINITIONS.map((category) => [category.id, 0]),
    )
    ratingFilteredPlaces.forEach((place) => {
      const category = classifyGooglePlace(place)
      counts.set(category.id, (counts.get(category.id) || 0) + 1)
    })
    return PLACE_CATEGORY_DEFINITIONS.map((category) => ({
      ...category,
      count: counts.get(category.id) || 0,
    })).filter((category) => category.count > 0)
  }, [ratingFilteredPlaces])

  const filteredPlaces = useMemo(() => {
    if (!selectedCategoryIds.length) return ratingFilteredPlaces
    const selected = new Set(selectedCategoryIds)
    return ratingFilteredPlaces.filter((place) =>
      selected.has(classifyGooglePlace(place).id),
    )
  }, [ratingFilteredPlaces, selectedCategoryIds])

  const menus = useMemo(() => placesToMenus(filteredPlaces), [filteredPlaces])

  const toggleCategory = useCallback((categoryId) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    )
  }, [])

  const weatherLocation = useMemo(() => {
    if (!coords) return null
    return {
      location_name: locationLabel || '내 위치',
      weather_latitude: coords.latitude,
      weather_longitude: coords.longitude,
      timezone: 'Asia/Seoul',
    }
  }, [coords, locationLabel])

  const coordsText = useMemo(() => {
    if (!coords) return ''
    return `${formatCoord(coords.latitude)}, ${formatCoord(coords.longitude)}`
  }, [coords])

  const locate = useCallback(async () => {
    setLocating(true)
    setLocateError(null)
    try {
      const position = await getCurrentPosition()
      setCoords(position)
      setLocatedAt(Date.now())
      const label = await reverseGeocodeLabel(
        position.latitude,
        position.longitude,
      )
      setLocationLabel(label || '내 위치')
      return position
    } catch (err) {
      console.error(err)
      setLocateError(err?.message || '위치를 확인하지 못했습니다.')
      throw err
    } finally {
      setLocating(false)
    }
  }, [])

  const loadNearby = useCallback(
    async ({ force = false, position: givenPosition = null } = {}) => {
      setLoading(true)
      setError(null)
      try {
        const position = givenPosition || coords
        if (!position) {
          throw new Error('먼저 현재 위치를 확인해주세요.')
        }

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
            setSelectedCategoryIds([])
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
        setSelectedCategoryIds([])
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
    [coords, settings.radiusMeters],
  )

  const clearCache = useCallback(() => {
    localStorage.removeItem(NEARBY_CACHE_KEY)
    setFromCache(false)
  }, [])

  return {
    settings,
    setSettings,
    coords,
    coordsText,
    locationLabel,
    locatedAt,
    locating,
    locateError,
    menus,
    rawPlaces,
    selectedCategoryIds,
    categoryCounts,
    toggleCategory,
    clearCategories: () => setSelectedCategoryIds([]),
    filteredPlaces,
    excludedIds,
    setExcludedIds,
    loading,
    error,
    fromCache,
    fetchedAt,
    apiCallsThisSession,
    weatherLocation,
    locate,
    loadNearby,
    clearCache,
  }
}
