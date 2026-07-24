import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import {
  NEARBY_CACHE_TTL_MS,
  NEARBY_MIN_RATING_OPTIONS,
  NEARBY_RADIUS_OPTIONS,
} from '../constants/app'
import { getTypeIcon } from '../constants/icons'

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
  selectedCategoryIds,
  categoryCounts,
  error,
  onLocate,
  onLoad,
  onForceRefresh,
  onToggleCategory,
  onClearCategories,
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
        현재 위치를 확인한 뒤 원하는 거리와 별점을 골라 식당을 찾아보세요.
      </p>

      <div className="nearby-location-box">
        <div className="nearby-location-main">
          <strong>{locating ? '위치 확인 중…' : locationLabel || '위치 미확인'}</strong>
          {coordsText ? <span>{coordsText}</span> : null}
          {locatedLabel ? <span>확인 {locatedLabel}</span> : null}
        </div>
        <Button
          type="button"
          className="icon-btn save"
          disabled={disabled || locating || loading}
          onClick={onLocate}
        >
          {locating ? '확인 중…' : '위치 다시 확인'}
        </Button>
      </div>
      {locateError ? (
        <div className="inline-error" role="alert">
          <span>{locateError}</span>
          <Button
            type="button"
            className="btn ghost"
            disabled={disabled || locating || loading}
            onClick={onLocate}
          >
            다시 시도
          </Button>
        </div>
      ) : null}

      <div className="nearby-fields">
        <label htmlFor="nearby-radius">
          반경
          <NativeSelect
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
          </NativeSelect>
        </label>

        <label htmlFor="nearby-rating">
          최소 별점
          <NativeSelect
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
          </NativeSelect>
        </label>
      </div>

      {categoryCounts.length ? (
        <fieldset className="nearby-categories">
          <legend>음식 종류</legend>
          <p className="desc">여러 종류를 함께 고를 수 있어요.</p>
          <div className="nearby-category-list">
            {categoryCounts.map((category) => {
              const selected = selectedCategoryIds.includes(category.id)
              const CategoryIcon = getTypeIcon(category.iconKey)
              return (
                <Button
                  key={category.id}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  aria-pressed={selected}
                  disabled={disabled || loading || locating}
                  onClick={() => onToggleCategory(category.id)}
                >
                  <CategoryIcon className="ui-icon" aria-hidden />
                  {category.label} {category.count}
                </Button>
              )
            })}
            {selectedCategoryIds.length ? (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || loading || locating}
                onClick={onClearCategories}
              >
                전체 보기
              </Button>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      <div className="nearby-actions">
        <Button
          type="button"
          className="btn primary"
          disabled={disabled || loading || locating || !coords}
          onClick={onLoad}
        >
          {loading ? '불러오는 중…' : '주변 식당 불러오기'}
        </Button>
        <Button
          type="button"
          className="btn ghost"
          disabled={disabled || loading || locating || !coords}
          onClick={onForceRefresh}
          title="저장된 목록 대신 주변 식당을 다시 찾아봅니다"
        >
          목록 새로 받기
        </Button>
      </div>
      {!coords && !locating ? (
        <p className="control-reason">
          주변 식당을 불러오려면 먼저 위치를 확인해주세요.
        </p>
      ) : null}

      <p className="nearby-hint">
        위치를 찾지 못하면 이 사이트의 위치 권한과 기기의 위치 설정을 켠 뒤 다시
        시도해주세요.
      </p>

      <div className="nearby-status">
        {error ? (
          <div className="inline-error" role="alert">
            <span>{error}</span>
            <Button
              type="button"
              className="btn ghost"
              disabled={disabled || loading || locating || !coords}
              onClick={onLoad}
            >
              다시 시도
            </Button>
          </div>
        ) : null}
        <p>
          찾은 식당 {filteredCount}곳
          {rawCount !== filteredCount ? ` · 전체 ${rawCount}곳 중 조건에 맞는 결과` : ''}
          {fromCache ? ' · 저장된 목록' : fetchedAt ? ' · 방금 업데이트' : ''}
        </p>
        {fetchedLabel ? <p>마지막으로 찾은 시간 {fetchedLabel}</p> : null}
        <p>이 목록은 {cacheMinutes}분 동안 빠르게 다시 볼 수 있어요.</p>
      </div>
    </section>
  )
}
