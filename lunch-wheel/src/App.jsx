import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import LunchWheel from './components/LunchWheel/LunchWheel'
import LunchRoomDialog from './components/LunchRoomDialog'
import LunchRoomPanel from './components/LunchRoomPanel'
import LunchRoomStart from './components/LunchRoomStart'
import CollapsibleSidePanel from './components/CollapsibleSidePanel'
import MenuExclusionList from './components/MenuExclusionList'
import MenuManagerDialog from './components/MenuManagerDialog'
import MenuTypeManagerDialog from './components/MenuTypeManagerDialog'
import NearbyControls from './components/NearbyControls'
import ProbabilityList from './components/ProbabilityList'
import RecentResultsPanel from './components/RecentResultsPanel'
import StateMessage from './components/StateMessage'
import { UI_ICONS } from './constants/icons'
import { useMenus } from './hooks/useMenus'
import { useDailyExclusions } from './hooks/useDailyExclusions'
import { useNearbyPlaces } from './hooks/useNearbyPlaces'
import { useLunchRoom } from './hooks/useLunchRoom'
import { useWeather } from './hooks/useWeather'
import { getWeightedMenus } from './utils/weatherWeights'
import { formatRoomEvent } from './utils/roomEvents'

function Toast({ message }) {
  return (
    <div
      className={`toast${message ? ' show' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('team')
  const isNearby = mode === 'nearby'
  const isRoom = mode === 'room'

  const {
    team,
    menuTypes,
    menus: teamMenus,
    excludedIds: teamExcludedIds,
    setExcludedIds: setTeamExcludedIds,
    loading,
    saving: menuSaving,
    error: dataError,
    addMenu,
    saveMenu,
    removeMenu,
    connectGooglePlace,
    disconnectGooglePlace,
    addMenuType,
    saveMenuType,
    removeMenuType,
  } = useMenus()

  const nearby = useNearbyPlaces()
  const lunchRoom = useLunchRoom(team?.id)

  const weatherLocation = isRoom
    ? null
    : isNearby
      ? nearby.weatherLocation
      : team
  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    refresh: refreshWeather,
  } = useWeather(weatherLocation)

  const {
    saving: exclusionSaving,
    toggleExclusion,
    banAll,
    clearAll,
  } = useDailyExclusions({
    teamId: team?.id,
    menus: teamMenus,
    excludedIds: teamExcludedIds,
    setExcludedIds: setTeamExcludedIds,
  })

  const menus = isNearby ? nearby.menus : teamMenus
  const excludedIds = isNearby ? nearby.excludedIds : teamExcludedIds

  const [displayOrder, setDisplayOrder] = useState([])
  const [manageOpen, setManageOpen] = useState(false)
  const [typeManageOpen, setTypeManageOpen] = useState(false)
  const [roomInviteCode] = useState(
    () => new URLSearchParams(window.location.search).get('room') || '',
  )
  const [roomDialogOpen, setRoomDialogOpen] = useState(Boolean(roomInviteCode))
  const [spinning, setSpinning] = useState(false)
  const [weatherWeightEnabled, setWeatherWeightEnabled] = useState(() => {
    try {
      return window.localStorage.getItem('weather-weight-enabled') !== 'false'
    } catch {
      return true
    }
  })
  const [recentResults, setRecentResults] = useState(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem('siksa-gacha-recent-results') || '[]',
      )
      return Array.isArray(stored) ? stored.slice(0, 10) : []
    } catch {
      return []
    }
  })
  const [reduceRecent, setReduceRecent] = useState(() => {
    try {
      return window.localStorage.getItem('siksa-gacha-reduce-recent') === 'true'
    } catch {
      return false
    }
  })
  const [toast, setToast] = useState('')
  const toastTimer = useRef(0)
  const lastRoomEventId = useRef(null)
  const lastRoomEventCode = useRef(null)

  const RefreshIcon = UI_ICONS.refresh
  const ListPlusIcon = UI_ICONS.listPlus

  useEffect(() => {
    setDisplayOrder(menus.map((menu) => menu.id))
  }, [menus])

  useEffect(() => {
    if (!weatherLocation) return
    refreshWeather()
  }, [weatherLocation, refreshWeather])

  const weightedItems = useMemo(
    () =>
      getWeightedMenus(
        menus,
        excludedIds,
        weatherWeightEnabled ? weather : null,
        {
          recentMenuIds: recentResults
            .filter((result) => result.mode === mode)
            .slice(0, 3)
            .map((result) => result.menuId),
          reduceRecent,
        },
      ),
    [
      menus,
      excludedIds,
      weather,
      weatherWeightEnabled,
      recentResults,
      mode,
      reduceRecent,
    ],
  )

  function handleWeatherWeightToggle(event) {
    const enabled = event.target.checked
    setWeatherWeightEnabled(enabled)
    try {
      window.localStorage.setItem('weather-weight-enabled', String(enabled))
    } catch {
      // The preference still works for the current session.
    }
    showToast(
      enabled
        ? '날씨 가중치를 적용합니다.'
        : `날씨 가중치를 끕니다.${reduceRecent ? ' 최근 결과 감산은 유지됩니다.' : ' 동일한 기본 확률을 사용합니다.'}`,
    )
  }

  function handleResult(menu) {
    const entry = {
      id:
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      menuId: menu.id,
      name: menu.name,
      mode,
      createdAt: new Date().toISOString(),
    }
    setRecentResults((current) => {
      const next = [entry, ...current].slice(0, 10)
      try {
        window.localStorage.setItem(
          'siksa-gacha-recent-results',
          JSON.stringify(next),
        )
      } catch {
        // Keep the current-session history when storage is unavailable.
      }
      return next
    })
  }

  function handleReduceRecent(enabled) {
    setReduceRecent(enabled)
    try {
      window.localStorage.setItem(
        'siksa-gacha-reduce-recent',
        String(enabled),
      )
    } catch {
      // Keep the current-session preference when storage is unavailable.
    }
    showToast(
      enabled
        ? '최근 3개 결과의 당첨 확률을 낮춥니다.'
        : '최근 결과 감산을 사용하지 않습니다.',
    )
  }

  function handleClearRecent() {
    if (!window.confirm('이 브라우저에 저장된 최근 결과를 모두 삭제할까요?')) {
      return
    }
    setRecentResults([])
    try {
      window.localStorage.removeItem('siksa-gacha-recent-results')
    } catch {
      // The in-memory history has still been cleared.
    }
    showToast('최근 결과를 삭제했습니다.')
  }

  const roomCandidateMenus = useMemo(() => {
    if (!lunchRoom.room || lunchRoom.room.status === 'OPEN') return null
    const ids = new Set(lunchRoom.room.candidateMenuIds || [])
    return lunchRoom.room.menus
      .filter((menu) => ids.has(menu.id))
      .map((menu, index) => ({
        id: menu.id,
        name: menu.name,
        sort_order: index,
        menu_type: {
          id: 'room-candidate',
          code: 'general',
          name: '점심방 후보',
          icon_key: 'utensils',
          color: '#6A5B85',
          weather_weight_config: { base: 1 },
        },
        place_links: [],
      }))
  }, [lunchRoom.room])

  const wheelMenus =
    isRoom && roomCandidateMenus?.length ? roomCandidateMenus : menus
  const wheelExcludedIds =
    isRoom && roomCandidateMenus?.length ? new Set() : excludedIds

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  useEffect(() => {
    return () => clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    const events = lunchRoom.room?.events || []
    const latest = events.at(-1)
    if (lastRoomEventCode.current !== lunchRoom.room?.code) {
      lastRoomEventCode.current = lunchRoom.room?.code
      lastRoomEventId.current = latest?.id || null
      return
    }
    if (!latest) return
    if (lastRoomEventId.current === latest.id) return
    lastRoomEventId.current = latest.id
    const currentMember = lunchRoom.room?.members?.find(
      (member) => member.id === lunchRoom.session?.memberId,
    )
    const nudgeIsForCurrentMember =
      latest.type !== 'NUDGE_SENT' || !currentMember?.isReady
    if (
      latest.actorMemberId !== lunchRoom.session?.memberId &&
      nudgeIsForCurrentMember
    ) {
      showToast(formatRoomEvent(latest))
    }
  }, [
    lunchRoom.room?.code,
    lunchRoom.room?.events,
    lunchRoom.room?.members,
    lunchRoom.session?.memberId,
  ])

  async function handleRefreshWeather() {
    const data = await refreshWeather()
    showToast(data ? '현재 날씨를 갱신했습니다.' : '날씨 연결에 실패했습니다.')
  }

  async function handleToggle(menuId, checked) {
    if (isNearby) {
      nearby.setExcludedIds((prev) => {
        const next = new Set(prev)
        if (checked) next.add(menuId)
        else next.delete(menuId)
        return next
      })
      return
    }
    try {
      await toggleExclusion(menuId, checked)
    } catch (err) {
      console.error(err)
      showToast(err?.message || '제외 상태를 저장하지 못했습니다.')
    }
  }

  async function handleBanAll() {
    if (isNearby) {
      nearby.setExcludedIds(new Set(menus.map((menu) => menu.id)))
      showToast('모든 메뉴를 제외했습니다.')
      return
    }
    try {
      await banAll()
      showToast('모든 메뉴를 제외했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '제외 상태를 저장하지 못했습니다.')
    }
  }

  async function handleClearAll() {
    if (isNearby) {
      nearby.setExcludedIds(new Set())
      showToast('모든 제외를 해제했습니다.')
      return
    }
    try {
      await clearAll()
      showToast('모든 제외를 해제했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '제외 상태를 저장하지 못했습니다.')
    }
  }

  async function handleAddMenu({ name, menuTypeId }) {
    if (!name) {
      showToast('추가할 메뉴 이름을 입력해주세요.')
      return
    }
    try {
      await addMenu({ name, menuTypeId })
      showToast('메뉴를 추가했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '메뉴를 추가하지 못했습니다.')
    }
  }

  async function handleSaveMenu({ id, name, menuTypeId }) {
    if (!name) {
      showToast('메뉴 이름을 입력해주세요.')
      return
    }
    try {
      await saveMenu({ id, name, menuTypeId })
      showToast('메뉴를 수정했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '메뉴를 수정하지 못했습니다.')
    }
  }

  async function handleDeleteMenu(id) {
    try {
      await removeMenu(id)
      showToast('메뉴를 삭제했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '메뉴를 삭제하지 못했습니다.')
    }
  }

  async function handleAddMenuType(payload) {
    try {
      await addMenuType(payload)
      showToast('메뉴 타입을 추가했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '메뉴 타입을 추가하지 못했습니다.')
    }
  }

  async function handleSaveMenuType(payload) {
    try {
      await saveMenuType(payload)
      showToast('메뉴 타입을 저장했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '메뉴 타입을 저장하지 못했습니다.')
    }
  }

  async function handleDeleteMenuType(id) {
    try {
      await removeMenuType(id)
      showToast('메뉴 타입을 삭제했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '메뉴 타입을 삭제하지 못했습니다.')
    }
  }

  async function handleNearbyLocate() {
    try {
      await nearby.locate()
      showToast('현재 위치를 확인했습니다.')
      await refreshWeather()
    } catch (err) {
      showToast(err?.message || '위치를 확인하지 못했습니다.')
    }
  }

  async function handleNearbyLoad() {
    try {
      const result = await nearby.loadNearby({ force: false })
      showToast(
        result.fromCache
          ? `캐시에서 ${result.places.length}곳을 불러왔습니다.`
          : `주변 식당 ${result.places.length}곳을 불러왔습니다. (Places 1회)`,
      )
      await refreshWeather()
    } catch (err) {
      showToast(err?.message || '주변 식당을 불러오지 못했습니다.')
    }
  }

  async function handleNearbyForceRefresh() {
    try {
      nearby.clearCache()
      const result = await nearby.loadNearby({ force: true })
      showToast(`주변 식당 ${result.places.length}곳을 새로 불러왔습니다. (Places 1회)`)
      await refreshWeather()
    } catch (err) {
      showToast(err?.message || '주변 식당을 불러오지 못했습니다.')
    }
  }

  async function handleCreateRoom(nickname, setup) {
    try {
      setMode('room')
      const resolvedSetup = setup || {
        locationMode: 'TEAM',
        locationLabel: team.location_name,
        candidates: teamMenus.map((menu, index) => ({
          sourceType: 'TEAM_MENU',
          menuId: menu.id,
          name: menu.name,
          sortOrder: index + 1,
        })),
      }
      const room = await lunchRoom.create(nickname, resolvedSetup)
      const inviteUrl = new URL(window.location.href)
      inviteUrl.searchParams.set('room', room.code)
      try {
        await navigator.clipboard.writeText(
          `오늘 점심 같이 골라요! 방 코드: ${room.code}\n${inviteUrl}`,
        )
        showToast(`점심방 ${room.code} 생성 · 초대 링크를 복사했어요.`)
      } catch {
        showToast(`점심방 ${room.code}를 만들었어요. 코드를 공유해주세요.`)
      }
    } catch (err) {
      showToast(err?.message || '점심방을 만들지 못했어요.')
      throw err
    }
  }

  async function handleJoinRoom(code, nickname) {
    try {
      setMode('room')
      await lunchRoom.join(code, nickname)
      showToast(`${code} 방에 참여했어요.`)
    } catch (err) {
      showToast(err?.message || '점심방에 참여하지 못했어요.')
      throw err
    }
  }

  async function handleRoomSpinComplete(menu) {
    if (!lunchRoom.session?.isHost) return
    try {
      await lunchRoom.complete(menu.id)
    } catch (err) {
      showToast(err?.message || '점심방 결과를 저장하지 못했어요.')
    }
  }

  useEffect(() => {
    if (!isNearby) return
    if (nearby.coords || nearby.locating) return
    nearby.locate().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-locate when entering nearby tab
  }, [isNearby])

  const busy =
    spinning || menuSaving || exclusionSaving || nearby.loading || nearby.locating
  const locationLabel = isRoom
    ? lunchRoom.room?.locationLabel || '점심방'
    : isNearby
      ? nearby.locating
        ? '위치 확인 중…'
        : nearby.locationLabel || (nearby.coords ? '내 위치' : '내 위치 (미확인)')
      : team?.location_name || '양재역'

  if (loading) {
    return (
      <main className="app" aria-busy="true">
        <StateMessage
          type="loading"
          title="메뉴를 준비하고 있어요"
          description="잠시만 기다려주세요."
        />
      </main>
    )
  }

  if (dataError || !team) {
    return (
      <main className="app">
        <StateMessage
          type="error"
          title="메뉴를 불러오지 못했어요"
          description={dataError || '팀 데이터를 찾을 수 없습니다.'}
          actionLabel="다시 시도"
          onAction={() => window.location.reload()}
        />
      </main>
    )
  }

  return (
    <main className="app">
      <a className="skip-link" href="#primary-content">
        주요 콘텐츠로 건너뛰기
      </a>
      <header className="topbar" id="primary-content" tabIndex="-1">
        <div>
          <div className="title-row">
            <h1>식사가챠</h1>
            <span className="title-location">{locationLabel}</span>
          </div>
          {isNearby ? (
            <div className="location-banner">
              <div className="location-banner-text">
                <strong>
                  {nearby.locating
                    ? '현재 위치 확인 중…'
                    : nearby.locationLabel || '현재 위치'}
                </strong>
                {nearby.coordsText ? (
                  <span className="location-coords">{nearby.coordsText}</span>
                ) : (
                  <span className="location-coords">좌표 없음</span>
                )}
                {nearby.locateError ? (
                  <span className="location-error">{nearby.locateError}</span>
                ) : null}
              </div>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={handleNearbyLocate}
                aria-label="현재 위치 다시 확인"
              >
                {nearby.locating ? '확인 중…' : '위치 다시 확인'}
              </button>
            </div>
          ) : null}
          <p className="subtitle">
            {isRoom
              ? '함께 고른 최종 후보를 동일한 확률로 결정합니다.'
              : isNearby
              ? `내 주변 식당으로 돌림판을 구성합니다.${reduceRecent ? ' 최근 결과는 당첨 확률을 낮춥니다.' : ' 후보 간 확률은 동일합니다.'}`
              : '현재 날씨와 메뉴 성격을 반영해 후보별 확률을 조정합니다.'}
          </p>
          <div className="mode-toggle" role="group" aria-label="돌림판 모드">
            <button
              type="button"
              aria-pressed={!isNearby && !isRoom}
              className={!isNearby && !isRoom ? 'is-active' : ''}
              disabled={busy}
              onClick={() => setMode('team')}
            >
              양재역 주변
            </button>
            <button
              type="button"
              aria-pressed={isRoom}
              className={isRoom ? 'is-active' : ''}
              disabled={busy}
              onClick={() => setMode('room')}
            >
              같이 고르기
            </button>
            <button
              type="button"
              aria-pressed={isNearby}
              className={isNearby ? 'is-active' : ''}
              disabled={busy}
              onClick={() => setMode('nearby')}
            >
              내 주변
            </button>
          </div>
        </div>
        <div className="toolbar">
          {!isRoom ? (
          <button
            type="button"
            className="btn ghost"
            disabled={busy || weatherLoading || (isNearby && !nearby.coords)}
            onClick={handleRefreshWeather}
            aria-label="날씨 새로고침"
          >
            <RefreshIcon className="ui-icon" aria-hidden />
            날씨 새로고침
          </button>
          ) : null}
          {!isNearby && !isRoom ? (
            <>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => setTypeManageOpen(true)}
                aria-label="메뉴 타입 관리"
              >
                타입 관리
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => setManageOpen(true)}
                aria-label="메뉴 관리"
              >
                <ListPlusIcon className="ui-icon" aria-hidden />
                메뉴 관리
              </button>
            </>
          ) : null}
        </div>
      </header>

      {isRoom && !lunchRoom.room ? (
        <LunchRoomStart
          team={team}
          teamMenus={teamMenus}
          nearby={nearby}
          loading={lunchRoom.loading}
          onCreate={handleCreateRoom}
          onOpenJoin={() => setRoomDialogOpen(true)}
          recentRooms={lunchRoom.recentRooms}
          recentLoading={lunchRoom.recentLoading}
          onResume={async (savedSession) => {
            try {
              await lunchRoom.resume(savedSession)
              showToast(`${savedSession.code} 방에 다시 들어왔어요.`)
            } catch (err) {
              showToast(err?.message || '방에 다시 들어가지 못했어요.')
            }
          }}
          onForget={lunchRoom.forget}
        />
      ) : null}

      {isRoom && lunchRoom.room ? (
        <LunchRoomPanel
          room={lunchRoom.room}
          session={lunchRoom.session}
          loading={lunchRoom.loading}
          onSetReady={async (isReady, likes, veto) => {
            try {
              await lunchRoom.setReady(isReady, likes, veto)
              showToast(isReady ? '준비 완료했어요!' : '준비를 취소했어요.')
            } catch (err) {
              showToast(err?.message || '준비 상태를 저장하지 못했어요.')
            }
          }}
          onCloseVoting={async () => {
            if (
              !window.confirm(
                '투표를 마감하면 좋아요와 제외 선택을 더 이상 바꿀 수 없습니다. 최종 후보를 결정할까요?',
              )
            ) {
              return
            }
            try {
              await lunchRoom.close()
              showToast('투표를 마감하고 후보를 정했어요.')
            } catch (err) {
              showToast(err?.message || '투표를 마감하지 못했어요.')
            }
          }}
          onLeave={lunchRoom.leave}
          onAddCandidates={lunchRoom.addCandidates}
          onRemoveCandidate={lunchRoom.removeCandidate}
          onNudge={async () => {
            try {
              await lunchRoom.nudge()
              showToast('아직 준비 전인 사람들에게 재촉 알림을 보냈어요.')
            } catch (err) {
              showToast(err?.message || '재촉 알림을 보내지 못했어요.')
            }
          }}
          onRename={async (nickname) => {
            try {
              await lunchRoom.rename(nickname)
              showToast(`닉네임을 '${nickname}'(으)로 바꿨어요.`)
              return true
            } catch (err) {
              showToast(err?.message || '닉네임을 바꾸지 못했어요.')
              return false
            }
          }}
          onTransferHost={async (memberId) => {
            try {
              await lunchRoom.transferHost(memberId)
              showToast('방장 권한을 넘겼어요.')
            } catch (err) {
              showToast(err?.message || '방장 권한을 넘기지 못했어요.')
            }
          }}
          onSendMessage={async (body) => {
            try {
              await lunchRoom.sendMessage(body)
            } catch (err) {
              showToast(err?.message || '메시지를 보내지 못했어요.')
              throw err
            }
          }}
          onToast={showToast}
        />
      ) : null}

      {!isRoom || (lunchRoom.room && lunchRoom.room.status !== 'OPEN') ? (
      <section className={`layout${isRoom ? ' room-wheel-layout' : ''}`}>
        <LunchWheel
          key={mode}
          team={weatherLocation || team}
          menus={wheelMenus}
          displayOrder={displayOrder}
          setDisplayOrder={setDisplayOrder}
          excludedIds={wheelExcludedIds}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          onRefreshWeather={refreshWeather}
          spinning={spinning}
          setSpinning={setSpinning}
          onToast={showToast}
          onSpinComplete={handleRoomSpinComplete}
          onRequestSpin={isRoom ? lunchRoom.startSpin : undefined}
          remoteSpin={
            isRoom && lunchRoom.room?.status === 'SPINNING'
              ? {
                  winnerId: lunchRoom.room.winnerMenuId,
                  startedAt: lunchRoom.room.spinStartedAt,
                  durationMs: lunchRoom.room.spinDurationMs,
                }
              : null
          }
          ignoreWeather={isRoom}
          weatherWeightEnabled={weatherWeightEnabled}
          recentMenuIds={recentResults
            .filter((result) => result.mode === mode)
            .slice(0, 3)
            .map((result) => result.menuId)}
          reduceRecent={!isRoom && reduceRecent}
          onResult={handleResult}
          shareLocationLabel={locationLabel}
          wheelMode={mode}
          disabledLabel={
            isRoom && lunchRoom.room?.status === 'COMPLETED'
              ? '결정 완료'
              : isRoom && !lunchRoom.session?.isHost
                ? '방장이 돌리는 중이에요'
                : undefined
          }
          disabledExtras={
            menuSaving ||
            exclusionSaving ||
            nearby.loading ||
            lunchRoom.loading ||
            (isNearby && menus.length === 0) ||
            (isRoom &&
              lunchRoom.room &&
              (lunchRoom.room.status === 'OPEN' ||
                lunchRoom.room.status === 'SPINNING' ||
                lunchRoom.room.status === 'COMPLETED' ||
                !lunchRoom.session?.isHost))
          }
        />

        {!isRoom ? (
        <aside className="side">
          <CollapsibleSidePanel
            title="날씨 가중치"
            summary={weatherWeightEnabled ? '사용 중' : '사용 안 함'}
          >
          <section className="card side-card weather-weight-control">
            <div>
              <h2>날씨 가중치</h2>
              <p className="desc">
                끄면 날씨와 관계없이 모든 활성 메뉴를 같은 확률로 돌립니다.
              </p>
            </div>
            <label className="switch-control">
              <input
                type="checkbox"
                checked={weatherWeightEnabled}
                disabled={busy}
                onChange={handleWeatherWeightToggle}
              />
              <span aria-hidden />
              <strong>{weatherWeightEnabled ? 'ON' : 'OFF'}</strong>
            </label>
          </section>
          </CollapsibleSidePanel>
          {isNearby ? (
            <CollapsibleSidePanel
              title="내 주변 설정"
              summary={nearby.coords ? '위치 확인됨' : '위치 확인 필요'}
              defaultMobileOpen={!nearby.menus.length}
            >
            <NearbyControls
              settings={nearby.settings}
              onSettingsChange={nearby.setSettings}
              loading={nearby.loading}
              locating={nearby.locating}
              disabled={spinning}
              coords={nearby.coords}
              coordsText={nearby.coordsText}
              locationLabel={nearby.locationLabel}
              locatedAt={nearby.locatedAt}
              locateError={nearby.locateError}
              fromCache={nearby.fromCache}
              fetchedAt={nearby.fetchedAt}
              filteredCount={nearby.filteredPlaces.length}
              rawCount={nearby.rawPlaces.length}
              apiCallsThisSession={nearby.apiCallsThisSession}
              error={nearby.error}
              onLocate={handleNearbyLocate}
              onLoad={handleNearbyLoad}
              onForceRefresh={handleNearbyForceRefresh}
            />
            </CollapsibleSidePanel>
          ) : null}

          <CollapsibleSidePanel
            title="오늘 제외할 메뉴"
            summary={`${excludedIds.size}개 제외`}
          >
          <MenuExclusionList
            menus={menus}
            excludedIds={excludedIds}
            disabled={busy}
            onToggle={handleToggle}
            onBanAll={handleBanAll}
            onClearAll={handleClearAll}
          />
          </CollapsibleSidePanel>
          <CollapsibleSidePanel
            title="현재 당첨 확률"
            summary={`${weightedItems.length}개 후보`}
          >
          <ProbabilityList
            items={weightedItems}
            weather={weatherWeightEnabled ? weather : null}
            reduceRecent={reduceRecent}
          />
          </CollapsibleSidePanel>
          <CollapsibleSidePanel
            title="최근 결과"
            summary={`${recentResults.length}개 기록`}
          >
            <RecentResultsPanel
              results={recentResults}
              reduceRecent={reduceRecent}
              disabled={busy}
              onToggleReduce={handleReduceRecent}
              onClear={handleClearRecent}
            />
          </CollapsibleSidePanel>
        </aside>
        ) : null}
      </section>
      ) : null}

      {!isRoom ? (
      <footer>
        현재 날씨: Open-Meteo API · 위치 기준: {locationLabel}
        {weatherLocation
          ? ` (${weatherLocation.weather_latitude}, ${weatherLocation.weather_longitude})`
          : ''}
        <br />
        {isNearby
          ? '내 주변 모드는 Places Nearby를 불러오기 버튼으로만 호출하고, 결과는 브라우저에 30분 캐시합니다.'
          : '메뉴와 오늘 제외 상태는 Supabase에 저장됩니다.'}
      </footer>
      ) : null}

      <MenuManagerDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        menus={teamMenus}
        menuTypes={menuTypes}
        team={team}
        saving={menuSaving}
        onAdd={handleAddMenu}
        onSave={handleSaveMenu}
        onDelete={handleDeleteMenu}
        onConnectPlace={connectGooglePlace}
        onDisconnectPlace={disconnectGooglePlace}
        onToast={showToast}
      />

      <LunchRoomDialog
        open={roomDialogOpen}
        defaultCode={roomInviteCode}
        onClose={() => setRoomDialogOpen(false)}
        loading={lunchRoom.loading}
        onCreate={handleCreateRoom}
        onJoin={handleJoinRoom}
      />

      <MenuTypeManagerDialog
        open={typeManageOpen}
        onClose={() => setTypeManageOpen(false)}
        menuTypes={menuTypes}
        saving={menuSaving}
        onAdd={handleAddMenuType}
        onSave={handleSaveMenuType}
        onDelete={handleDeleteMenuType}
        onToast={showToast}
      />

      <Toast message={toast} />
    </main>
  )
}
