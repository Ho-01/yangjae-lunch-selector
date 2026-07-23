import { useState } from 'react'
import { searchGooglePlaces } from '../services/placesApi'

function teamCandidates(menus) {
  return menus.map((menu, index) => ({
    sourceType: 'TEAM_MENU',
    menuId: menu.id,
    name: menu.name,
    sortOrder: index + 1,
  }))
}

function nearbyCandidates(menus) {
  return menus.map((menu, index) => {
    const link = menu.place_links?.[0] || {}
    return {
      sourceType: 'NEARBY',
      provider: link.provider || 'google',
      placeId: link.place_id,
      name: menu.name,
      address: link.formatted_address,
      rating: link.rating,
      ratingCount: link.rating_count,
      sortOrder: index + 1,
    }
  })
}

function placeCandidates(places) {
  return places.map((place, index) => ({
    sourceType: 'NEARBY',
    provider: 'google',
    placeId: place.placeId,
    name: place.placeName,
    address: place.formattedAddress,
    rating: place.rating,
    ratingCount: place.ratingCount,
    sortOrder: index + 1,
  }))
}

export default function LunchRoomStart({
  team,
  teamMenus,
  nearby,
  loading,
  onCreate,
  onOpenJoin,
}) {
  const [nickname, setNickname] = useState('')
  const [source, setSource] = useState('TEAM')
  const [manualName, setManualName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [customCandidates, setCustomCandidates] = useState([])

  function addManualCandidate() {
    const name = manualName.trim()
    if (!name || customCandidates.some((item) => item.name === name)) return
    setCustomCandidates((prev) => [
      ...prev,
      { sourceType: 'MANUAL', name },
    ])
    setManualName('')
  }

  async function searchPlaces() {
    if (searchQuery.trim().length < 2) return
    setSearching(true)
    try {
      setSearchResults(
        await searchGooglePlaces({ query: searchQuery.trim() }),
      )
    } finally {
      setSearching(false)
    }
  }

  function addSearchCandidate(place) {
    if (customCandidates.some((item) => item.placeId === place.placeId)) return
    setCustomCandidates((prev) => [
      ...prev,
      {
        sourceType: 'PLACE_SEARCH',
        provider: 'google',
        placeId: place.placeId,
        name: place.placeName,
        address: place.formattedAddress,
        rating: place.rating,
        ratingCount: place.ratingCount,
      },
    ])
    setSearchResults((prev) =>
      prev.filter((item) => item.placeId !== place.placeId),
    )
  }

  async function create() {
    let candidates
    let setup
    if (source === 'TEAM') {
      candidates = teamCandidates(teamMenus)
      setup = { locationMode: 'TEAM', locationLabel: team.location_name }
    } else if (source === 'NEARBY') {
      const position = nearby.coords || (await nearby.locate())
      let places
      if (nearby.menus.length) candidates = nearbyCandidates(nearby.menus)
      else {
        const result = await nearby.loadNearby({ force: false, position })
        places = result.places
        candidates = placeCandidates(places)
      }
      setup = {
        locationMode: 'NEARBY',
        locationLabel: nearby.locationLabel || '현재 위치 주변',
        latitude: position.latitude,
        longitude: position.longitude,
        radiusMeters: nearby.settings.radiusMeters,
      }
    } else {
      candidates = customCandidates.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }))
      setup = { locationMode: 'NONE', locationLabel: '위치 지정 없음' }
    }
    await onCreate(nickname.trim(), { ...setup, candidates })
  }

  return (
    <section className="room-start card">
      <div className="room-start-head">
        <div>
          <span>같이 고르는 점심</span>
          <h2>어디를 기준으로 고를까요?</h2>
          <p>방을 만든 뒤 장소 검색이나 이름 직접 추가도 할 수 있어요.</p>
        </div>
        <button type="button" className="btn ghost" onClick={onOpenJoin}>
          코드로 참여
        </button>
      </div>
      <div className="room-source-grid">
        {[
          ['TEAM', '양재역 목록', '등록된 메뉴로 바로 시작'],
          ['NEARBY', '내 위치 주변', '현재 위치 반경의 식당으로 시작'],
          ['NONE', '직접 목록 만들기', '검색과 직접 입력을 섞어서 시작'],
        ].map(([id, title, desc]) => (
          <button
            type="button"
            key={id}
            className={source === id ? 'is-active' : ''}
            onClick={() => setSource(id)}
          >
            <strong>{title}</strong>
            <span>{desc}</span>
          </button>
        ))}
      </div>
      {source === 'NONE' ? (
        <div className="room-candidate-builder">
          <div className="room-builder-section">
            <strong>Google에서 식당 검색</strong>
            <div>
              <input
                value={searchQuery}
                placeholder="식당명 또는 지역과 메뉴"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') searchPlaces()
                }}
              />
              <button type="button" className="btn ghost" onClick={searchPlaces}>
                {searching ? '검색 중…' : '검색'}
              </button>
            </div>
            {searchResults.length ? (
              <div className="room-builder-results">
                {searchResults.map((place) => (
                  <button
                    type="button"
                    key={place.placeId}
                    onClick={() => addSearchCandidate(place)}
                  >
                    <strong>{place.placeName}</strong>
                    <span>{place.formattedAddress}</span>
                    <em>추가</em>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="room-builder-section">
            <strong>이름만 직접 추가</strong>
            <div>
              <input
                value={manualName}
                placeholder="예: 김치찌개"
                onChange={(event) => setManualName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addManualCandidate()
                }}
              />
              <button type="button" className="btn ghost" onClick={addManualCandidate}>
                추가
              </button>
            </div>
          </div>
          <div className="room-builder-picked">
            <span>선택한 후보 {customCandidates.length}개 · 최소 2개</span>
            {customCandidates.map((candidate, index) => (
              <div key={candidate.placeId || `${candidate.name}-${index}`}>
                <span>
                  <strong>{candidate.name}</strong>
                  {candidate.sourceType === 'PLACE_SEARCH' ? ' · Google 장소' : ' · 직접 입력'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomCandidates((prev) =>
                      prev.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {source === 'NEARBY' ? (
        <div className="room-radius">
          <span>검색 반경</span>
          <select
            value={nearby.settings.radiusMeters}
            onChange={(event) =>
              nearby.setSettings((prev) => ({
                ...prev,
                radiusMeters: Number(event.target.value),
              }))
            }
          >
            <option value={500}>500m</option>
            <option value={1000}>1km</option>
            <option value={2000}>2km</option>
            <option value={3000}>3km</option>
          </select>
          <small>{nearby.locationLabel || '방을 만들 때 현재 위치를 확인합니다.'}</small>
        </div>
      ) : null}
      <div className="room-start-create">
        <input
          value={nickname}
          maxLength={20}
          placeholder="내 닉네임"
          onChange={(event) => setNickname(event.target.value)}
        />
        <button
          type="button"
          className="btn primary"
          disabled={
            loading ||
            !nickname.trim() ||
            (source === 'NONE' && customCandidates.length < 2)
          }
          onClick={create}
        >
          {loading ? '준비 중…' : '점심방 만들기'}
        </button>
      </div>
    </section>
  )
}
