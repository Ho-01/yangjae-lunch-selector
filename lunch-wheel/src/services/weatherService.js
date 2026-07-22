import { WEATHER_TIMEOUT_MS } from '../constants/app'

/**
 * @param {{ weather_latitude: number, weather_longitude: number, timezone?: string }} location
 */
export async function fetchCurrentWeather(location) {
  const fields = [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'precipitation',
    'rain',
    'snowfall',
    'weather_code',
    'wind_speed_10m',
  ].join(',')

  const params = new URLSearchParams({
    latitude: String(location.weather_latitude),
    longitude: String(location.weather_longitude),
    current: fields,
    timezone: location.timezone || 'Asia/Seoul',
  })

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`weather http ${res.status}`)

    const data = await res.json()
    if (!data.current) throw new Error('current weather missing')

    return {
      temp: Number(data.current.temperature_2m),
      feels: Number(data.current.apparent_temperature),
      humidity: Number(data.current.relative_humidity_2m),
      precipitation: Number(data.current.precipitation || 0),
      rain: Number(data.current.rain || 0),
      snowfall: Number(data.current.snowfall || 0),
      code: Number(data.current.weather_code),
      wind: Number(data.current.wind_speed_10m),
      time: data.current.time,
    }
  } finally {
    clearTimeout(timer)
  }
}
