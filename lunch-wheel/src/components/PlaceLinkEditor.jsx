import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { getPrimaryGoogleLink, searchGooglePlaces } from '../services/placesApi'
import { getPlacePhotoSrcs } from '../services/placePhotoCache'

export default function PlaceLinkEditor({
  menu,
  team,
  saving,
  onConnect,
  onDisconnect,
  onToast,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(menu.name || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const link = getPrimaryGoogleLink(menu.place_links)
  const photos = link ? getPlacePhotoSrcs(link, 4) : []

  async function handleSearch() {
    const q = query.trim() || menu.name
    if (!q) {
      onToast?.('검색어를 입력해주세요.')
      return
    }
    setSearching(true)
    try {
      const places = await searchGooglePlaces({
        query: q,
        latitude: team?.weather_latitude,
        longitude: team?.weather_longitude,
      })
      setResults(places)
      if (!places.length) onToast?.('검색 결과가 없습니다.')
    } catch (err) {
      console.error(err)
      onToast?.(err?.message || '장소 검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  async function handleSelect(place) {
    try {
      await onConnect({ menuId: menu.id, place })
      setOpen(false)
      setResults([])
      onToast?.('Google 장소를 연결했습니다.')
    } catch (err) {
      console.error(err)
      onToast?.(err?.message || '장소 연결에 실패했습니다.')
    }
  }

  async function handleDisconnect() {
    try {
      await onDisconnect(menu.id)
      onToast?.('Google 장소 연결을 해제했습니다.')
    } catch (err) {
      console.error(err)
      onToast?.(err?.message || '연결 해제에 실패했습니다.')
    }
  }

  return (
    <div className="place-link-editor">
      {link ? (
        <div className="place-link-summary">
          <div className="place-link-meta">
            <strong>{link.place_name || 'Google 장소'}</strong>
            <span>
              {link.rating != null
                ? `별점 ${Number(link.rating).toFixed(1)}`
                : '별점 없음'}
              {link.rating_count != null ? ` · 리뷰 ${link.rating_count}` : ''}
            </span>
            {link.formatted_address ? (
              <span className="place-link-address">{link.formatted_address}</span>
            ) : null}
          </div>
          <div className="place-link-actions">
            {link.url ? (
              <a
                className="icon-btn"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                지도
              </a>
            ) : null}
            <Button
              type="button"
              className="icon-btn"
              disabled={saving}
              onClick={() => {
                setQuery(menu.name)
                setOpen((prev) => !prev)
              }}
            >
              변경
            </Button>
            <Button
              type="button"
              className="icon-btn delete"
              disabled={saving}
              onClick={handleDisconnect}
            >
              해제
            </Button>
          </div>
          {photos.length > 0 ? (
            <div className="place-photo-row">
              {photos.map((src) => (
                <img key={src} src={src} alt="" loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="place-link-empty">
          <span>Google 장소 미연결</span>
          <Button
            type="button"
            className="icon-btn save"
            disabled={saving}
            onClick={() => {
              setQuery(menu.name)
              setOpen(true)
            }}
          >
            장소 연결
          </Button>
        </div>
      )}

      {open ? (
        <div className="place-search-panel">
          <div className="place-search-row">
            <label className="sr-only" htmlFor={`place-search-${menu.id}`}>
              Google 장소 검색
            </label>
            <Input
              id={`place-search-${menu.id}`}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSearch()
                }
              }}
              placeholder="장소 이름 검색"
            />
            <Button
              type="button"
              className="btn primary"
              disabled={searching || saving}
              onClick={handleSearch}
            >
              {searching ? '검색 중…' : '검색'}
            </Button>
          </div>
          <div className="place-search-results">
            {results.map((place) => (
              <Button
                key={place.placeId}
                type="button"
                className="place-result"
                disabled={saving}
                onClick={() => handleSelect(place)}
              >
                <div>
                  <strong>{place.placeName}</strong>
                  <span>{place.formattedAddress}</span>
                </div>
                <em>
                  {place.rating != null
                    ? `${Number(place.rating).toFixed(1)}★`
                    : '—'}
                </em>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
