import {
  LuCloud,
  LuCloudDrizzle,
  LuCloudFog,
  LuCloudLightning,
  LuCloudRain,
  LuCloudSun,
  LuCrown,
  LuFlame,
  LuLeaf,
  LuListPlus,
  LuLoader,
  LuPencil,
  LuRefreshCw,
  LuSearch,
  LuShare2,
  LuShuffle,
  LuSnowflake,
  LuSoup,
  LuSun,
  LuThermometer,
  LuTriangleAlert,
  LuUtensils,
  LuX,
} from 'react-icons/lu'
import { MdOutlineRiceBowl } from 'react-icons/md'

export const TYPE_ICON_MAP = {
  soup: LuSoup,
  snowflake: LuSnowflake,
  bowl: MdOutlineRiceBowl,
  leaf: LuLeaf,
  fire: LuFlame,
  utensils: LuUtensils,
}

export const WEATHER_ICON_MAP = {
  sun: LuSun,
  cloudSun: LuCloudSun,
  cloud: LuCloud,
  cloudFog: LuCloudFog,
  cloudDrizzle: LuCloudDrizzle,
  cloudRain: LuCloudRain,
  snowflake: LuSnowflake,
  cloudLightning: LuCloudLightning,
  thermometer: LuThermometer,
  loader: LuLoader,
  alert: LuTriangleAlert,
}

export const UI_ICONS = {
  refresh: LuRefreshCw,
  search: LuSearch,
  share: LuShare2,
  listPlus: LuListPlus,
  shuffle: LuShuffle,
  close: LuX,
  crown: LuCrown,
  pencil: LuPencil,
}

export function getTypeIcon(iconKey) {
  return TYPE_ICON_MAP[iconKey] || LuUtensils
}

export function getWeatherIcon(iconKey) {
  return WEATHER_ICON_MAP[iconKey] || LuThermometer
}
