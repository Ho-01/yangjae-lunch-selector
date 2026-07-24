import { useState } from 'react'
import RecentRooms from './RecentRooms'

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
  recentRooms,
  recentLoading,
  onResume,
  onForget,
}) {
  const [nickname, setNickname] = useState('')
  const [source, setSource] = useState('TEAM')

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
      candidates = []
      setup = { locationMode: 'NONE', locationLabel: '위치 지정 없음' }
    }
    await onCreate(nickname.trim(), { ...setup, candidates })
  }

  return (
    <>
    <RecentRooms
      rooms={recentRooms}
      loading={recentLoading}
      disabled={loading}
      onResume={onResume}
      onForget={onForget}
    />
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
          ['NONE', '빈 방으로 시작', '방을 만든 뒤 후보를 추가'],
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
          placeholder="닉네임 (비워두면 자동 생성)"
          onChange={(event) => setNickname(event.target.value)}
        />
        <button
          type="button"
          className="btn primary"
          disabled={loading}
          onClick={create}
        >
          {loading ? '준비 중…' : '점심방 만들기'}
        </button>
      </div>
    </section>
    </>
  )
}
