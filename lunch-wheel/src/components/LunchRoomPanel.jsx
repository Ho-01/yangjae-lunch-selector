import { useMemo, useState } from 'react'
import { searchGooglePlaces } from '../services/placesApi'

export default function LunchRoomPanel({
  room,
  session,
  loading,
  onVote,
  onCloseVoting,
  onLeave,
  onAddCandidates,
  onRemoveCandidate,
  onToast,
}) {
  const [likes, setLikes] = useState([])
  const [veto, setVeto] = useState(null)
  const [query, setQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  const winner = room.menus.find((menu) => menu.id === room.winnerMenuId)
  const candidates = useMemo(
    () => new Set(room.candidateMenuIds || []),
    [room.candidateMenuIds],
  )

  function toggleLike(menuId) {
    setLikes((prev) => {
      if (prev.includes(menuId)) return prev.filter((id) => id !== menuId)
      if (prev.length >= 3) {
        onToast('먹고 싶은 메뉴는 최대 3개까지 골라주세요.')
        return prev
      }
      if (veto === menuId) setVeto(null)
      return [...prev, menuId]
    })
  }

  async function shareRoom() {
    const url = new URL(window.location.href)
    url.searchParams.set('room', room.code)
    const text = `오늘 점심 같이 골라요! 방 코드: ${room.code}`
    try {
      if (navigator.share) {
        await navigator.share({ title: '점심방 초대', text, url: url.toString() })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        onToast('방 코드를 복사했어요.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') onToast('방 코드를 공유하지 못했어요.')
    }
  }

  async function searchPlaces() {
    if (query.trim().length < 2) return
    setSearching(true)
    try {
      setSearchResults(await searchGooglePlaces({
        query: query.trim(),
        latitude: room.latitude,
        longitude: room.longitude,
      }))
    } catch (err) {
      onToast(err.message || '식당을 검색하지 못했어요.')
    } finally {
      setSearching(false)
    }
  }

  async function addPlace(place) {
    await onAddCandidates([{
      sourceType: 'PLACE_SEARCH',
      provider: 'google',
      placeId: place.placeId,
      name: place.placeName,
      address: place.formattedAddress,
      rating: place.rating,
      ratingCount: place.ratingCount,
    }])
    setSearchResults((prev) => prev.filter((item) => item.placeId !== place.placeId))
    onToast('후보에 추가했어요.')
  }

  async function addManual() {
    if (!manualName.trim()) return
    await onAddCandidates([{ sourceType: 'MANUAL', name: manualName.trim() }])
    setManualName('')
    onToast('후보에 추가했어요.')
  }

  return (
    <section className="room-panel" aria-live="polite">
      <div className="room-panel-head">
        <div>
          <span className="room-kicker">같이 고르는 점심방</span>
          <strong className="room-code">{room.code}</strong>
        </div>
        <div className="room-head-actions">
          <button type="button" className="btn ghost" onClick={shareRoom}>
            코드 공유
          </button>
          <button type="button" className="btn ghost" onClick={onLeave}>
            나가기
          </button>
        </div>
      </div>

      <div className="room-members">
        {room.members.map((member) => (
          <span key={member.id}>
            {member.isHost ? '👑 ' : ''}
            {member.nickname}
          </span>
        ))}
      </div>

      {room.status === 'OPEN' ? (
        <>
          <div className="room-candidate-tools">
              <div>
                <input
                  value={query}
                  placeholder="식당 검색해서 추가"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && searchPlaces()}
                />
                <button type="button" className="btn ghost" disabled={searching} onClick={searchPlaces}>
                  {searching ? '검색 중…' : '검색'}
                </button>
              </div>
              {searchResults.length ? (
                <div className="room-search-results">
                  {searchResults.map((place) => (
                    <button type="button" key={place.placeId} onClick={() => addPlace(place)}>
                      <strong>{place.placeName}</strong>
                      <span>{place.formattedAddress}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div>
                <input
                  value={manualName}
                  placeholder="이름만 직접 추가"
                  onChange={(event) => setManualName(event.target.value)}
                />
                <button type="button" className="btn ghost" onClick={addManual}>추가</button>
              </div>
          </div>
          <div className="room-instruction">
            <strong>먹고 싶은 메뉴 최대 3개</strong>
            <span>정말 피하고 싶은 메뉴는 1개만 제외할 수 있어요.</span>
          </div>
          <div className="room-menu-grid">
            {room.menus.map((menu) => (
              <div className="room-menu-item" key={menu.id}>
                <button
                  type="button"
                  className={`room-like${likes.includes(menu.id) ? ' is-active' : ''}`}
                  onClick={() => toggleLike(menu.id)}
                >
                  <strong>{menu.name}</strong>
                  <span>좋아요 {menu.likeCount}</span>
                </button>
                {session.isHost ? (
                  <button
                    type="button"
                    className="room-remove"
                    title="후보 삭제"
                    onClick={() => onRemoveCandidate(menu.id)}
                  >
                    ×
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`room-veto${veto === menu.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setVeto((prev) => (prev === menu.id ? null : menu.id))
                    setLikes((prev) => prev.filter((id) => id !== menu.id))
                  }}
                  aria-label={`${menu.name} 제외`}
                  title="이 메뉴는 피하고 싶어요"
                >
                  제외 {menu.vetoCount}
                </button>
              </div>
            ))}
          </div>
          <div className="room-panel-actions">
            <button
              type="button"
              className="btn primary"
              disabled={loading}
              onClick={() => onVote(likes, veto)}
            >
              내 선택 저장
            </button>
            {session.isHost ? (
              <button
                type="button"
                className="btn ghost"
                disabled={loading}
                onClick={onCloseVoting}
              >
                투표 마감
              </button>
            ) : null}
          </div>
        </>
      ) : room.status === 'VOTING_CLOSED' ? (
        <div className="room-finalists">
          <span>최종 룰렛 후보</span>
          <div>
            {room.menus
              .filter((menu) => candidates.has(menu.id))
              .map((menu) => (
                <strong key={menu.id}>{menu.name}</strong>
              ))}
          </div>
          <p>
            {session.isHost
              ? '이제 아래 룰렛을 돌려주세요!'
              : '방장이 룰렛을 돌리고 있어요. 결과를 기다려주세요.'}
          </p>
        </div>
      ) : (
        <div className="room-winner">
          <span>오늘의 점심</span>
          <strong>{winner?.name || '결과 확인 중'}</strong>
          <p>결과에 승복하고 맛있게 먹으러 가요!</p>
        </div>
      )}
    </section>
  )
}
