import PlaceMeta from './PlaceMeta'

export default function ResultCard({
  visible,
  menuName,
  reason,
  placeLinks,
  onShare,
}) {
  return (
    <div className={`result${visible ? ' show' : ''}`} aria-live="polite">
      <div className="small">선택 결과</div>
      <div className="menu">{menuName || '—'}</div>
      <div className="why">{reason}</div>
      {visible && onShare ? (
        <button type="button" className="btn ghost result-share" onClick={onShare}>
          결과 공유하기
        </button>
      ) : null}
      {placeLinks?.length ? (
        <div className="result-place">
          <PlaceMeta placeLinks={placeLinks} showPhotos />
        </div>
      ) : null}
    </div>
  )
}
