export const TEAM_SLUG = 'yangjae-lunch'

export const colors = {
  primary: '#58CC02',
  onPrimary: '#FFFFFF',
  primaryHover: '#49AD00',
  primaryShadow: '#58A700',
  secondary: '#1CB0F6',
  accentYellow: '#FFC800',
  accentRed: '#FF4B4B',
  accentPurple: '#CE82FF',
  ink: '#3C3C3C',
  inkMuted: '#777777',
  canvas: '#FFFFFF',
  surface1: '#F7F7F7',
  surface2: '#EBEBEB',
  border: '#E5E5E5',
}

export const WHEEL_COLORS = [
  '#58CC02',
  '#1CB0F6',
  '#FFC800',
  '#FF4B4B',
  '#CE82FF',
  '#FF9600',
  '#89E219',
  '#84D8FF',
  '#FFD900',
  '#FF8A8A',
  '#D7A8FF',
  '#72D92B',
]

export const WEIGHT_MIN = 0.18
export const WEIGHT_MAX = 4.2

export const WEATHER_TIMEOUT_MS = 7000

/** Nearby mode: Places API is only called on explicit refresh */
export const NEARBY_CACHE_KEY = 'yangjaeNearbyPlacesCacheV1'
export const NEARBY_SETTINGS_KEY = 'yangjaeNearbySettingsV1'
export const NEARBY_CACHE_TTL_MS = 30 * 60 * 1000
export const NEARBY_RADIUS_OPTIONS = [500, 1000, 1500, 2000, 3000]
export const NEARBY_MIN_RATING_OPTIONS = [0, 3.5, 4.0, 4.3]
export const NEARBY_MAX_RESULTS = 15

/** Team menu Google place cache (ratings + Storage photos) */
export const PLACE_LINK_REFRESH_MS = 7 * 24 * 60 * 60 * 1000
export const PLACE_PHOTO_BUCKET = 'menu-place-photos'
export const PLACE_CACHE_MAX_PHOTOS = 3

/** Keys edited in menu-type weather weight UI */
export const WEATHER_WEIGHT_FIELDS = [
  {
    key: 'base',
    label: '기본',
    hint: '날씨 없을 때 / 항상 시작 배수',
  },
  {
    key: 'very_cold',
    label: '매우 추움',
    hint: '체감 ≤ 4℃',
  },
  {
    key: 'cold',
    label: '추움',
    hint: '체감 4℃ 초과 ~ 13℃ 이하',
  },
  {
    key: 'normal',
    label: '보통',
    hint: '체감 13℃ 초과 ~ 25℃ 미만',
  },
  {
    key: 'hot',
    label: '더움',
    hint: '체감 25℃ 이상 ~ 30℃ 미만',
  },
  {
    key: 'very_hot',
    label: '매우 더움',
    hint: '체감 ≥ 30℃',
  },
  {
    key: 'rain',
    label: '비',
    hint: '강수/비 코드',
  },
  {
    key: 'snow',
    label: '눈',
    hint: '적설/눈 코드',
  },
  {
    key: 'humid',
    label: '고온다습',
    hint: '습도 ≥ 78% 이고 체감 ≥ 22℃',
  },
  {
    key: 'cold_wind',
    label: '한파+강풍',
    hint: '바람 ≥ 25km/h 이고 체감 ≤ 15℃',
  },
]

export const DEFAULT_WEATHER_WEIGHT_CONFIG = {
  base: 1,
  very_cold: 1,
  cold: 1,
  normal: 1,
  hot: 1,
  very_hot: 1,
  rain: 1,
  snow: 1,
  humid: 1,
  cold_wind: 1,
}

export const MENU_TYPE_ICON_OPTIONS = [
  { value: 'soup', label: '국물' },
  { value: 'snowflake', label: '시원' },
  { value: 'bowl', label: '든든' },
  { value: 'leaf', label: '가벼움' },
  { value: 'fire', label: '매콤' },
  { value: 'utensils', label: '일반' },
]

export const MENU_TYPE_COLOR_PRESETS = [
  '#D86B1F',
  '#168FC7',
  '#826000',
  '#4D8A28',
  '#D23F3F',
  '#6A5B85',
]
