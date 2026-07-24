import { Button } from '@/components/ui/button'
const STATUS_LABELS = {
  OPEN: '후보 고르는 중',
  VOTING_CLOSED: '최종 후보 결정',
  SPINNING: '룰렛 진행 중',
  COMPLETED: '결과 확인',
}

function formatExpiry(value) {
  if (!value) return '만료 시간 확인 불가'
  return `${new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}까지`
}

function formatActivity(value) {
  if (!value) return null
  return `최근 ${new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`
}

export default function RecentRooms({
  rooms,
  loading,
  disabled,
  onResume,
  onForget,
}) {
  if (!loading && !rooms.length) return null

  return (
    <section className="recent-rooms card" aria-busy={loading}>
      <div className="recent-rooms-head">
        <div>
          <span>이 기기에 저장됨</span>
          <h2>최근 참여한 방</h2>
        </div>
        <small>최대 10개 · 다른 기기와 동기화되지 않아요.</small>
      </div>

      {loading && !rooms.length ? (
        <div className="empty-hint" role="status">
          최근 방을 확인하고 있어요…
        </div>
      ) : (
        <div className="recent-room-list">
          {rooms.map((room) => (
            <article
              className={`recent-room-item${room.available ? '' : ' is-unavailable'}`}
              key={`${room.code}:${room.memberId}`}
            >
              <div className="recent-room-code">
                <strong>{room.code}</strong>
                <span>
                  {room.available
                    ? STATUS_LABELS[room.status] || room.status
                    : room.unavailableReason}
                </span>
              </div>
              <div className="recent-room-meta">
                <span>{room.locationLabel || '점심방'}</span>
                {room.available ? (
                  <>
                    <span>{room.memberCount}명</span>
                    {formatActivity(room.updatedAt) ? (
                      <span>{formatActivity(room.updatedAt)}</span>
                    ) : null}
                    <span>{formatExpiry(room.expiresAt)}</span>
                  </>
                ) : null}
              </div>
              <div className="recent-room-actions">
                <Button
                  type="button"
                  className="btn primary"
                  disabled={disabled || !room.available}
                  onClick={() => onResume(room)}
                >
                  다시 들어가기
                </Button>
                <Button
                  type="button"
                  className="btn ghost"
                  disabled={disabled}
                  onClick={() => onForget(room.code)}
                  aria-label={`${room.code} 방을 최근 목록에서 삭제`}
                >
                  목록에서 삭제
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
