import { getPrimaryGoogleLink } from '../services/placesApi'
import { getPlacePhotoSrcs } from '../services/placePhotoCache'

export default function PlaceMeta({
  placeLinks,
  compact = false,
  showPhotos = false,
}) {
  const link = getPrimaryGoogleLink(placeLinks)
  if (!link) return null

  const photos = showPhotos ? getPlacePhotoSrcs(link, compact ? 3 : 4) : []

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
      {photos.length > 0 ? (
        <div className="place-photo-row">
          {photos.map((src) => (
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </div>
      ) : null}
    </div>
  )
}
