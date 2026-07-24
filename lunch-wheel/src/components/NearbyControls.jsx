import {
  NEARBY_CACHE_TTL_MS,
  NEARBY_MIN_RATING_OPTIONS,
  NEARBY_RADIUS_OPTIONS,
} from '../constants/app'

export default function NearbyControls({
  settings,
  onSettingsChange,
  loading,
  locating,
  disabled,
  coords,
  coordsText,
  locationLabel,
  locatedAt,
  locateError,
  fromCache,
  fetchedAt,
  filteredCount,
  rawCount,
  apiCallsThisSession,
  error,
  onLocate,
  onLoad,
  onForceRefresh,
}) {
  const cacheMinutes = Math.round(NEARBY_CACHE_TTL_MS / 60000)
  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  const locatedLabel = locatedAt
    ? new Date(locatedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <section className="card side-card nearby-card">
      <h2>내 주변 설정</h2>
      <p className="desc">
        위치 확인과 식당 검색은 분리되어 있습니다. Places 호출은 &quot;주변 식당
        불러오기&quot;를 누를 때만 나갑니다.
      </p>

      <div className="nearby-location-box">
        <div className="nearby-location-main">
          <strong>{locating ? '위치 확인 중…' : locationLabel || '위치 미확인'}</strong>
          {coordsText ? <span>{coordsText}</span> : null}
          {locatedLabel ? <span>확인 {locatedLabel}</span> : null}
        </div>
        <button
          type="button"
          className="icon-btn save"
          disabled={disabled || locating || loading}
          onClick={onLocate}
        >
          {locating ? '확인 중…' : '위치 다시 확인'}
        </button>
      </div>
      {locateError ? (
        <div className="inline-error" role="alert">
          <span>{locateError}</span>
          <button
            type="button"
            className="btn ghost"
            disabled={disabled || locating || loading}
            onClick={onLocate}
          >
            다시 시도
          </button>
        </div>
      ) : null}

      <div className="nearby-fields">
        <label htmlFor="nearby-radius">
          반경
          <select
            id="nearby-radius"
            value={settings.radiusMeters}
            disabled={disabled || loading || locating}
            onChange={(event) =>
              onSettingsChange({ radiusMeters: Number(event.target.value) })
            }
          >
            {NEARBY_RADIUS_OPTIONS.map((meters) => (
              <option key={meters} value={meters}>
                {meters}m
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="nearby-rating">
          최소 별점
          <select
            id="nearby-rating"
            value={settings.minRating}
            disabled={disabled || loading || locating}
            onChange={(event) =>
              onSettingsChange({ minRating: Number(event.target.value) })
            }
          >
            {NEARBY_MIN_RATING_OPTIONS.map((rating) => (
              <option key={rating} value={rating}>
                {rating === 0 ? '제한 없음' : `${rating}점 이상`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="nearby-actions">
        <button
          type="button"
          className="btn primary"
          disabled={disabled || loading || locating || !coords}
          onClick={onLoad}
        >
          {loading ? '불러오는 중…' : '주변 식당 불러오기'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={disabled || loading || locating || !coords}
          onClick={onForceRefresh}
          title="캐시를 무시하고 Places API를 다시 호출합니다"
        >
          강제 새로고침
        </button>
      </div>
      {!coords && !locating ? (
        <p className="control-reason">
          주변 식당을 불러오려면 먼저 위치를 확인해주세요.
        </p>
      ) : null}

      <p className="nearby-hint">
        위치가 안 되면: 사이트 위치 권한 허용, Windows 위치 서비스 ON,
        HTTPS/localhost 접속을 확인하세요.
      </p>

      <div className="nearby-status">
        {error ? (
          <div className="inline-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn ghost"
              disabled={disabled || loading || locating || !coords}
              onClick={onLoad}
            >
              다시 시도
            </button>
          </div>
        ) : null}
        <p>
          목록 {filteredCount}곳
          {rawCount !== filteredCount ? ` (필터 전 ${rawCount})` : ''}
          {fromCache ? ' · 캐시 사용 중' : fetchedAt ? ' · API 방금 호출' : ''}
        </p>
        {fetchedLabel ? <p>식당 목록 갱신 {fetchedLabel}</p> : null}
        <p>
          이번 세션 Places 호출 {apiCallsThisSession}회 · 캐시 유효 {cacheMinutes}
          분
        </p>
      </div>
    </section>
  )
}
