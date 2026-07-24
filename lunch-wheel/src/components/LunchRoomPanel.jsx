import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useMemo, useState } from 'react'
import { searchGooglePlaces } from '../services/placesApi'
import {
  createRoomResultImage,
  downloadRoomResult,
} from '../utils/roomShareCard'
import { UI_ICONS } from '../constants/icons'
import { getResultIcon } from '../constants/icons'
import { formatRoomEvent } from '../utils/roomEvents'
import { pickResultMessage } from '../utils/resultMessages'
import RoomChat from './RoomChat'

export default function LunchRoomPanel({
  room,
  session,
  loading,
  onSetReady,
  onCloseVoting,
  onLeave,
  onAddCandidates,
  onRemoveCandidate,
  onNudge,
  onRename,
  onTransferHost,
  onSendMessage,
  onToast,
}) {
  const CrownIcon = UI_ICONS.crown
  const PencilIcon = UI_ICONS.pencil
  const [likes, setLikes] = useState([])
  const [veto, setVeto] = useState(null)
  const [query, setQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [candidateSource, setCandidateSource] = useState('search')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const [renaming, setRenaming] = useState(false)
  const [nicknameDraft, setNicknameDraft] = useState('')

  const winner = room.menus.find((menu) => menu.id === room.winnerMenuId)
  const resultMessage = useMemo(
    () => (winner ? pickResultMessage(winner.name) : null),
    [winner],
  )
  const ResultIcon = getResultIcon(resultMessage?.iconKey)
  const currentMember = room.members.find((member) => member.id === session.memberId)
  const isReady = Boolean(currentMember?.isReady)
  const readyCount = room.members.filter((member) => member.isReady).length
  const allReady = room.members.length > 0 && readyCount === room.members.length
  const canFinalize = allReady && room.menus.length >= 2
  const latestOwnNudge = useMemo(
    () =>
      [...(room.events || [])]
        .reverse()
        .find(
          (event) =>
            event.type === 'NUDGE_SENT' &&
            event.actorMemberId === session.memberId,
        ),
    [room.events, session.memberId],
  )
  const nudgeRemaining = latestOwnNudge
    ? Math.max(
        0,
        60 -
          Math.floor(
            (clock - new Date(latestOwnNudge.createdAt).getTime()) / 1000,
          ),
      )
    : 0
  const candidates = useMemo(
    () => new Set(room.candidateMenuIds || []),
    [room.candidateMenuIds],
  )

  useEffect(() => {
    if (!latestOwnNudge || nudgeRemaining <= 0) return undefined
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [latestOwnNudge, nudgeRemaining])

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
    if (query.trim().length < 2) {
      setSearchError('식당 이름을 2자 이상 입력해주세요.')
      return
    }
    setSearching(true)
    setSearchError('')
    setSearchAttempted(true)
    try {
      setSearchResults(await searchGooglePlaces({
        query: query.trim(),
        latitude: room.latitude,
        longitude: room.longitude,
      }))
    } catch (err) {
      setSearchError(err.message || '식당을 검색하지 못했어요. 다시 시도해주세요.')
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

  async function saveNickname() {
    const nickname = nicknameDraft.trim()
    if (!nickname) {
      onToast('새 닉네임을 입력해주세요.')
      return
    }
    const saved = await onRename(nickname)
    if (saved !== false) setRenaming(false)
  }

  async function shareResult() {
    try {
      const blob = await createRoomResultImage(room, resultMessage?.text)
      const file = new File([blob], `오늘-점심-${room.code}.png`, {
        type: 'image/png',
      })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `오늘의 점심: ${winner?.name || ''}`,
          text: resultMessage?.text,
          files: [file],
        })
      } else {
        downloadRoomResult(blob, room.code)
        onToast('공유 대신 결과 이미지를 저장했어요.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') onToast('결과 이미지를 공유하지 못했어요.')
    }
  }

  async function saveResult() {
    try {
      downloadRoomResult(
        await createRoomResultImage(room, resultMessage?.text),
        room.code,
      )
      onToast('결과 이미지를 저장했어요.')
    } catch {
      onToast('결과 이미지를 만들지 못했어요.')
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
          <Button type="button" className="btn ghost" onClick={shareRoom}>
            코드 공유
          </Button>
          <Button type="button" className="btn ghost" onClick={onLeave}>
            나가기
          </Button>
        </div>
      </div>

      <div className="room-members">
        {room.members.map((member) => (
          <span
            key={member.id}
            className={`${member.isReady ? 'is-ready' : ''}${
              member.id === session.memberId ? ' is-current' : ''
            }`}
          >
            {member.isHost ? <CrownIcon className="room-host-icon" aria-label="방장" /> : null}
            {member.nickname}
            {member.id === session.memberId ? <small>나</small> : null}
            {member.isReady ? <small>준비</small> : null}
            {session.isHost && member.id !== session.memberId ? (
              <Button
                type="button"
                className="room-transfer-host"
                disabled={loading}
                onClick={() => {
                  if (
                    window.confirm(
                      `${member.nickname}님에게 방장 권한을 넘길까요?`,
                    )
                  ) {
                    onTransferHost(member.id)
                  }
                }}
              >
                방장 넘기기
              </Button>
            ) : null}
          </span>
        ))}
      </div>
      <div className="room-profile">
        {renaming ? (
          <div className="room-rename-form">
            <Input
              value={nicknameDraft}
              maxLength={20}
              autoFocus
              aria-label="새 닉네임"
              onChange={(event) => setNicknameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveNickname()
                if (event.key === 'Escape') setRenaming(false)
              }}
            />
            <Button
              type="button"
              className="btn primary"
              disabled={loading}
              onClick={saveNickname}
            >
              저장
            </Button>
            <Button
              type="button"
              className="btn ghost"
              onClick={() => setRenaming(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            className="room-rename-open"
            onClick={() => {
              setNicknameDraft(currentMember?.nickname || '')
              setRenaming(true)
            }}
          >
            <PencilIcon className="ui-icon" aria-hidden />
            내 닉네임 변경
          </Button>
        )}
      </div>

      {room.events?.length ? (
        <div className="room-activity">
          <strong>최근 활동</strong>
          <div>
            {room.events
              .slice(-5)
              .reverse()
              .map((event) => (
                <span key={event.id}>{formatRoomEvent(event)}</span>
              ))}
          </div>
        </div>
      ) : null}

      <RoomChat
        messages={room.messages}
        currentMemberId={session.memberId}
        disabled={loading}
        onSend={onSendMessage}
      />

      {room.status === 'OPEN' ? (
        <>
          <div className="room-candidate-tools">
            <div
              className="candidate-source-tabs"
              role="tablist"
              aria-label="후보 추가 방법"
            >
              <Button
                type="button"
                role="tab"
                aria-selected={candidateSource === 'search'}
                className={candidateSource === 'search' ? 'is-active' : ''}
                onClick={() => setCandidateSource('search')}
              >
                식당 검색
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={candidateSource === 'manual'}
                className={candidateSource === 'manual' ? 'is-active' : ''}
                onClick={() => setCandidateSource('manual')}
              >
                이름 직접 추가
              </Button>
            </div>
            {candidateSource === 'search' ? (
              <div className="candidate-source-panel" role="tabpanel">
                <p>Google 장소 검색 결과에서 식당을 후보로 추가합니다.</p>
              <div>
                <Input
                  value={query}
                  aria-label="추가할 식당 검색"
                  placeholder="예: 양재역 국밥"
                  disabled={isReady}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && searchPlaces()}
                />
                <Button type="button" className="btn ghost" disabled={searching || isReady} onClick={searchPlaces}>
                  {searching ? '검색 중…' : '검색'}
                </Button>
              </div>
              {searchResults.length ? (
                <div className="room-search-results">
                  {searchResults.map((place) => (
                    <Button type="button" key={place.placeId} disabled={isReady} onClick={() => addPlace(place)}>
                      <strong>{place.placeName}</strong>
                      <span>{place.formattedAddress}</span>
                    </Button>
                  ))}
                </div>
              ) : null}
              {searchAttempted && !searching && !searchResults.length && !searchError ? (
                <p className="candidate-empty">검색 결과가 없습니다. 다른 이름으로 검색해보세요.</p>
              ) : null}
              {searchError ? (
                <div className="inline-error" role="alert">
                  <span>{searchError}</span>
                  {searchAttempted ? (
                    <Button type="button" className="btn ghost" onClick={searchPlaces}>
                      다시 시도
                    </Button>
                  ) : null}
                </div>
              ) : null}
              </div>
            ) : (
              <div className="candidate-source-panel" role="tabpanel">
                <p>장소 정보 없이 원하는 메뉴나 식당 이름만 직접 추가합니다.</p>
              <div>
                <Input
                  value={manualName}
                  aria-label="직접 추가할 후보 이름"
                  placeholder="예: 김치찌개"
                  disabled={isReady}
                  onChange={(event) => setManualName(event.target.value)}
                />
                <Button type="button" className="btn ghost" disabled={isReady} onClick={addManual}>추가</Button>
              </div>
              </div>
            )}
          </div>
          <div className="room-instruction">
            <strong>먹고 싶은 메뉴 최대 3개</strong>
            <span>정말 피하고 싶은 메뉴는 1개만 제외할 수 있어요.</span>
          </div>
          <div className="room-menu-grid">
            {room.menus.map((menu) => (
              <div className="room-menu-item" key={menu.id}>
                <Button
                  type="button"
                  className={`room-like${likes.includes(menu.id) ? ' is-active' : ''}`}
                  disabled={isReady}
                  onClick={() => toggleLike(menu.id)}
                >
                  <strong>{menu.name}</strong>
                  <span>좋아요 {menu.likeCount}</span>
                </Button>
                {session.isHost ? (
                  <Button
                    type="button"
                    className="room-remove"
                    title="후보 삭제"
                    disabled={isReady}
                    onClick={() => {
                      if (window.confirm(`'${menu.name}' 후보를 삭제할까요?`)) {
                        onRemoveCandidate(menu.id)
                      }
                    }}
                  >
                    ×
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className={`room-veto${veto === menu.id ? ' is-active' : ''}`}
                  disabled={isReady}
                  onClick={() => {
                    setVeto((prev) => (prev === menu.id ? null : menu.id))
                    setLikes((prev) => prev.filter((id) => id !== menu.id))
                  }}
                  aria-label={`${menu.name} 제외`}
                  title="이 메뉴는 피하고 싶어요"
                >
                  제외 {menu.vetoCount}
                </Button>
              </div>
            ))}
          </div>
          <div className="room-ready-status">
            <div>
              <strong>{readyCount}/{room.members.length}명 준비 완료</strong>
              <span>
                {room.menus.length < 2
                  ? '룰렛 후보를 2개 이상 추가해주세요.'
                  : allReady
                  ? '모두 준비됐어요. 방장이 최종 후보를 결정할 수 있어요.'
                  : '선택을 마치면 준비 완료를 눌러주세요.'}
              </span>
            </div>
            <div
              className="room-ready-progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax={room.members.length}
              aria-valuenow={readyCount}
            >
              <i
                style={{
                  width: `${room.members.length ? (readyCount / room.members.length) * 100 : 0}%`,
                }}
              />
            </div>
            {isReady && !allReady ? (
              <Button
                type="button"
                className="room-nudge"
                disabled={loading || nudgeRemaining > 0}
                onClick={onNudge}
              >
                {nudgeRemaining > 0
                  ? `${nudgeRemaining}초 후 다시 재촉`
                  : '아직 준비 전인 사람 재촉하기'}
              </Button>
            ) : null}
          </div>
          <div className="room-panel-actions">
            <Button
              type="button"
              className={`btn ${isReady ? 'ghost' : 'primary'}`}
              disabled={loading}
              onClick={() => onSetReady(!isReady, likes, veto)}
            >
              {isReady ? '준비 취소' : '준비 완료!'}
            </Button>
            {session.isHost ? (
              <Button
                type="button"
                className="btn primary"
                disabled={loading || !canFinalize}
                onClick={onCloseVoting}
              >
                {room.menus.length < 2
                  ? '후보 2개 이상 필요'
                  : allReady
                    ? '최종 후보 결정'
                    : `${readyCount}/${room.members.length}명 준비`}
              </Button>
            ) : null}
          </div>
        </>
      ) : room.status === 'VOTING_CLOSED' || room.status === 'SPINNING' ? (
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
            {room.status === 'SPINNING'
              ? '모두의 화면에서 룰렛이 돌아가고 있어요!'
              : session.isHost
              ? '이제 아래 룰렛을 돌려주세요!'
              : '방장이 룰렛을 돌리고 있어요. 결과를 기다려주세요.'}
          </p>
        </div>
      ) : (
        <div className="room-winner">
          <span>오늘의 점심</span>
          <strong>{winner?.name || '결과 확인 중'}</strong>
          <p className="room-result-message">
            {resultMessage ? (
              <>
                <ResultIcon className="ui-icon" aria-hidden />
                <span>{resultMessage.text}</span>
              </>
            ) : (
              '결과에 승복하고 맛있게 먹으러 가요!'
            )}
          </p>
          <div className="room-result-actions">
            <Button type="button" className="btn primary" onClick={shareResult}>
              결과 공유
            </Button>
            <Button type="button" className="btn ghost" onClick={saveResult}>
              이미지 저장
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
