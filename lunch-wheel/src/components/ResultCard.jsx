import PlaceMeta from './PlaceMeta'

export default function ResultCard({ visible, menuName, reason, placeLinks }) {
  return (
    <div className={`result${visible ? ' show' : ''}`} aria-live="polite">
      <div className="small">선택 결과</div>
      <div className="menu">{menuName || '—'}</div>
      <div className="why">{reason}</div>
      {placeLinks?.length ? (
        <div className="result-place">
          <PlaceMeta placeLinks={placeLinks} showPhotos />
        </div>
      ) : null}
    </div>
  )
}
