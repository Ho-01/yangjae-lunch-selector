import {
  NEARBY_CACHE_TTL_MS,
  NEARBY_MIN_RATING_OPTIONS,
  NEARBY_RADIUS_OPTIONS,
} from '../constants/app'

export default function NearbyControls({
  settings,
  onSettingsChange,
  loading,
  disabled,
  fromCache,
  fetchedAt,
  filteredCount,
  rawCount,
  apiCallsThisSession,
  error,
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

  return (
    <section className="card side-card nearby-card">
      <h2>내 주변 설정</h2>
      <p className="desc">
        Places 호출은 &quot;불러오기&quot;를 누를 때만 나갑니다. 돌림판을 돌릴 때는
        캐시된 목록만 사용합니다. 사진은 요청하지 않습니다.
      </p>

      <div className="nearby-fields">
        <label htmlFor="nearby-radius">
          반경
          <select
            id="nearby-radius"
            value={settings.radiusMeters}
            disabled={disabled || loading}
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
            disabled={disabled || loading}
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
          disabled={disabled || loading}
          onClick={onLoad}
        >
          {loading ? '불러오는 중…' : '주변 식당 불러오기'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={disabled || loading}
          onClick={onForceRefresh}
          title="캐시를 무시하고 Places API를 다시 호출합니다"
        >
          강제 새로고침
        </button>
      </div>

      <div className="nearby-status">
        {error ? <p className="nearby-error">{error}</p> : null}
        <p>
          목록 {filteredCount}곳
          {rawCount !== filteredCount ? ` (필터 전 ${rawCount})` : ''}
          {fromCache ? ' · 캐시 사용 중' : fetchedAt ? ' · API 방금 호출' : ''}
        </p>
        {fetchedLabel ? <p>마지막 갱신 {fetchedLabel}</p> : null}
        <p>
          이번 세션 Places 호출 {apiCallsThisSession}회 · 캐시 유효 {cacheMinutes}
          분
        </p>
      </div>
    </section>
  )
}
