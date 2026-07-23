import { useMemo, useState } from 'react'

export default function LunchRoomPanel({
  room,
  session,
  loading,
  onVote,
  onCloseVoting,
  onLeave,
  onToast,
}) {
  const [likes, setLikes] = useState([])
  const [veto, setVeto] = useState(null)

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
