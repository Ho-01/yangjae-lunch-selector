import { getWeatherIcon } from '../constants/icons'
import { getWeatherDescription } from '../utils/weatherWeights'

export default function WeatherPanel({
  team,
  weather,
  loading,
  error,
}) {
  const location = team?.location_name || '양재역'

  let Icon = getWeatherIcon('loader')
  let iconClass = 'ui-icon is-loading'
  let title = `${location} 날씨를 확인하는 중…`
  let meta = '날씨를 불러오지 못해도 기본 확률로 돌릴 수 있습니다.'
  let timeLabel = '—'

  if (!loading && error) {
    Icon = getWeatherIcon('alert')
    iconClass = 'ui-icon is-alert'
    title = '날씨 연결 실패 · 기본 확률 사용'
    meta = '인터넷 연결을 확인한 뒤 다시 시도해주세요.'
    timeLabel = '기본 모드'
  } else if (!loading && weather) {
    const desc = getWeatherDescription(weather.code)
    Icon = getWeatherIcon(desc.iconKey)
    iconClass = 'ui-icon'
    title = `${desc.label} · ${weather.temp.toFixed(1)}℃`
    const rainText =
      weather.precipitation > 0 ? ` · 강수 ${weather.precipitation}mm` : ''
    meta = `체감 ${weather.feels.toFixed(1)}℃ · 습도 ${weather.humidity}% · 바람 ${weather.wind.toFixed(1)}km/h${rainText}`
    timeLabel = weather.time
      ? `${weather.time.replace('T', ' ')} 기준`
      : '현재 기준'
  }

  return (
    <div className="weather-strip">
      <div className="weather-icon" aria-hidden>
        <Icon className={iconClass} />
      </div>
      <div>
        <div className="weather-title">{title}</div>
        <div className="weather-meta">{meta}</div>
      </div>
      <div className="weather-time">{timeLabel}</div>
    </div>
  )
}
