import { useCallback, useState } from 'react'
import { fetchCurrentWeather } from '../services/weatherService'

/**
 * @param {{ weather_latitude: number, weather_longitude: number, timezone?: string } | null} location
 */
export function useWeather(location) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!location) return null

      if (!quiet) {
        setLoading(true)
      }
      setError(null)

      try {
        const data = await fetchCurrentWeather(location)
        setWeather(data)
        return data
      } catch (err) {
        console.error(err)
        setWeather(null)
        setError(err?.message || '날씨 조회에 실패했습니다.')
        return null
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [location],
  )

  return {
    weather,
    loading,
    error,
    refresh,
  }
}
