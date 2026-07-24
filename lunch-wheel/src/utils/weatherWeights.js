import { WEIGHT_MAX, WEIGHT_MIN } from '../constants/app.js'

const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]
const SNOW_CODES = [71, 73, 75, 77, 85, 86]

/**
 * @param {object | null} weather
 */
export function getWeatherFlags(weather) {
  if (!weather) {
    return {
      tempCategory: null,
      isRain: false,
      isSnow: false,
      isHumid: false,
      isColdWind: false,
      temp: null,
    }
  }

  const temp = Number.isFinite(weather.feels) ? weather.feels : weather.temp
  const isRain =
    weather.precipitation > 0 ||
    weather.rain > 0 ||
    RAIN_CODES.includes(weather.code)
  const isSnow = weather.snowfall > 0 || SNOW_CODES.includes(weather.code)
  const isHumid = weather.humidity >= 78 && temp >= 22
  const isColdWind = weather.wind >= 25 && temp <= 15

  let tempCategory = 'normal'
  if (temp <= 4) tempCategory = 'very_cold'
  else if (temp <= 13) tempCategory = 'cold'
  else if (temp >= 30) tempCategory = 'very_hot'
  else if (temp >= 25) tempCategory = 'hot'

  return { tempCategory, isRain, isSnow, isHumid, isColdWind, temp }
}

function configValue(config, key, fallback = 1) {
  const value = config?.[key]
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

/**
 * @param {{ weight_config?: object } | null} weatherProfile
 * @param {object | null} weather
 */
export function calculateMenuWeight(weatherProfile, weather) {
  const config = weatherProfile?.weight_config ?? {}
  let weight = configValue(config, 'base', 1)

  if (!weather) {
    return Math.max(WEIGHT_MIN, Math.min(weight, WEIGHT_MAX))
  }

  const flags = getWeatherFlags(weather)
  if (flags.tempCategory) {
    weight *= configValue(config, flags.tempCategory, 1)
  }
  if (flags.isRain) weight *= configValue(config, 'rain', 1)
  if (flags.isSnow) weight *= configValue(config, 'snow', 1)
  if (flags.isHumid) weight *= configValue(config, 'humid', 1)
  if (flags.isColdWind) weight *= configValue(config, 'cold_wind', 1)

  return Math.max(WEIGHT_MIN, Math.min(weight, WEIGHT_MAX))
}

/**
 * @param {Array<{ id: string, name: string, weather_profile?: object }>} menus
 * @param {Set<string>|string[]} excludedIds
 * @param {object | null} weather
 */
export function getWeightedMenus(
  menus,
  excludedIds,
  weather,
  { recentMenuIds = [], reduceRecent = false } = {},
) {
  const banned = excludedIds instanceof Set ? excludedIds : new Set(excludedIds)
  const recent = new Set(recentMenuIds)
  return menus
    .filter((menu) => !banned.has(menu.id))
    .map((menu) => ({
      ...menu,
      weight:
        calculateMenuWeight(
          menu.weather_profile ?? {
            code: menu.menu_type?.code,
            weight_config: menu.menu_type?.weather_weight_config,
          },
          weather,
        ) *
        (reduceRecent && recent.has(menu.id) ? 0.55 : 1),
      recentPenalty: reduceRecent && recent.has(menu.id),
    }))
}

/**
 * @param {object} menu
 * @param {object | null} weather
 */
export function weatherReason(menu, weather) {
  if (!weather) {
    return '날씨 연결이 되지 않아 모든 메뉴를 같은 기본 확률로 추첨했어요.'
  }

  const flags = getWeatherFlags(weather)
  const code = menu.weather_profile?.code ?? menu.menu_type?.code

  if (code === 'hot_soup' && (flags.temp <= 13 || flags.isRain)) {
    return '쌀쌀하거나 비 오는 날에 잘 맞는 뜨끈한 메뉴라 확률이 올라갔어요.'
  }
  if (code === 'cool' && flags.temp >= 25) {
    return '더운 날씨에 잘 맞는 시원한 메뉴라 확률이 올라갔어요.'
  }
  if (code === 'light' && flags.temp >= 25) {
    return '덥고 습한 날에도 부담이 적은 메뉴라 확률이 올라갔어요.'
  }
  if (code === 'hearty' && flags.temp <= 13) {
    return '쌀쌀한 날 든든하게 먹기 좋은 메뉴라 확률이 올라갔어요.'
  }
  if (code === 'spicy') {
    return '오늘 날씨 가중치와 전체 메뉴 비율을 반영해 선택됐어요.'
  }
  return '현재 날씨, 제외 목록, 메뉴 성격별 가중치를 모두 반영해 선택됐어요.'
}

export function getWeatherDescription(code) {
  if (code === 0) return { label: '맑음', iconKey: 'sun' }
  if ([1, 2].includes(code)) return { label: '대체로 맑음', iconKey: 'cloudSun' }
  if (code === 3) return { label: '흐림', iconKey: 'cloud' }
  if ([45, 48].includes(code)) return { label: '안개', iconKey: 'cloudFog' }
  if ([51, 53, 55, 56, 57].includes(code)) return { label: '이슬비', iconKey: 'cloudDrizzle' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: '비', iconKey: 'cloudRain' }
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '눈', iconKey: 'snowflake' }
  if ([95, 96, 99].includes(code)) return { label: '뇌우', iconKey: 'cloudLightning' }
  return { label: '날씨 정보', iconKey: 'thermometer' }
}
