import { getPrimaryGoogleLink, googlePlacePhotoUrl } from '../services/placesApi'

export default function PlaceMeta({
  placeLinks,
  compact = false,
  showPhotos = false,
}) {
  const link = getPrimaryGoogleLink(placeLinks)
  if (!link) return null

  return (
    <div className={`place-meta${compact ? ' is-compact' : ''}`}>
      <div className="place-meta-row">
        {link.rating != null ? (
          <span className="place-rating">
            Google {Number(link.rating).toFixed(1)}
            {link.rating_count != null ? ` (${link.rating_count})` : ''}
          </span>
        ) : (
          <span className="place-rating muted">Google 별점 없음</span>
        )}
        {link.url ? (
          <a
            className="place-map-link"
            href={link.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            지도
          </a>
        ) : null}
      </div>
      {showPhotos && Array.isArray(link.photo_refs) && link.photo_refs.length > 0 ? (
        <div className="place-photo-row">
          {link.photo_refs.slice(0, 4).map((photo) => (
            <img
              key={photo.name}
              src={googlePlacePhotoUrl(photo.name, compact ? 96 : 180)}
              alt=""
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
