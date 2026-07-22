import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import LunchWheel from './components/LunchWheel/LunchWheel'
import MenuExclusionList from './components/MenuExclusionList'
import MenuManagerDialog from './components/MenuManagerDialog'
import NearbyControls from './components/NearbyControls'
import ProbabilityList from './components/ProbabilityList'
import { UI_ICONS } from './constants/icons'
import { useMenus } from './hooks/useMenus'
import { useDailyExclusions } from './hooks/useDailyExclusions'
import { useNearbyPlaces } from './hooks/useNearbyPlaces'
import { useWeather } from './hooks/useWeather'
import { getWeightedMenus } from './utils/weatherWeights'

function Toast({ message }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>
}

export default function App() {
  const [mode, setMode] = useState('team')
  const isNearby = mode === 'nearby'

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
  } = useMenus()

  const nearby = useNearbyPlaces()

  const weatherLocation = isNearby ? nearby.weatherLocation : team
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
  const [spinning, setSpinning] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(0)

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
    () => getWeightedMenus(menus, excludedIds, weather),
    [menus, excludedIds, weather],
  )

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  useEffect(() => {
    return () => clearTimeout(toastTimer.current)
  }, [])

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

  const busy =
    spinning || menuSaving || exclusionSaving || nearby.loading
  const locationLabel = isNearby
    ? nearby.coords
      ? '내 위치'
      : '내 위치 (미확인)'
    : team?.location_name || '양재역'

  if (loading) {
    return (
      <main className="app">
        <div className="state-panel">메뉴와 팀 데이터를 불러오는 중…</div>
      </main>
    )
  }

  if (dataError || !team) {
    return (
      <main className="app">
        <div className="state-panel error">
          <strong>Supabase 연결 실패</strong>
          <p>{dataError || '팀 데이터를 찾을 수 없습니다.'}</p>
          <p className="hint">
            마이그레이션과 seed SQL을 실행했는지, 환경변수가 올바른지
            확인해주세요.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">{locationLabel} 기준 · 현재 날씨 반영</div>
          <h1>오늘 뭐 먹지?</h1>
          <p className="subtitle">
            {isNearby
              ? '내 주변 식당으로 돌림판을 구성합니다. 후보 간 확률은 동일합니다.'
              : '현재 날씨와 메뉴 성격을 반영해 후보별 확률을 조정합니다.'}
          </p>
          <div className="mode-toggle" role="tablist" aria-label="돌림판 모드">
            <button
              type="button"
              role="tab"
              aria-selected={!isNearby}
              className={!isNearby ? 'is-active' : ''}
              disabled={busy}
              onClick={() => setMode('team')}
            >
              팀 메뉴
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isNearby}
              className={isNearby ? 'is-active' : ''}
              disabled={busy}
              onClick={() => setMode('nearby')}
            >
              내 주변
            </button>
          </div>
        </div>
        <div className="toolbar">
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
          {!isNearby ? (
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
          ) : null}
        </div>
      </header>

      <section className="layout">
        <LunchWheel
          team={weatherLocation || team}
          menus={menus}
          displayOrder={displayOrder}
          setDisplayOrder={setDisplayOrder}
          excludedIds={excludedIds}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          onRefreshWeather={refreshWeather}
          spinning={spinning}
          setSpinning={setSpinning}
          onToast={showToast}
          disabledExtras={
            menuSaving ||
            exclusionSaving ||
            nearby.loading ||
            (isNearby && menus.length === 0)
          }
        />

        <aside className="side">
          {isNearby ? (
            <NearbyControls
              settings={nearby.settings}
              onSettingsChange={nearby.setSettings}
              loading={nearby.loading}
              disabled={spinning}
              fromCache={nearby.fromCache}
              fetchedAt={nearby.fetchedAt}
              filteredCount={nearby.filteredPlaces.length}
              rawCount={nearby.rawPlaces.length}
              apiCallsThisSession={nearby.apiCallsThisSession}
              error={nearby.error}
              onLoad={handleNearbyLoad}
              onForceRefresh={handleNearbyForceRefresh}
            />
          ) : null}

          <MenuExclusionList
            menus={menus}
            excludedIds={excludedIds}
            disabled={busy}
            onToggle={handleToggle}
            onBanAll={handleBanAll}
            onClearAll={handleClearAll}
          />
          <ProbabilityList items={weightedItems} weather={weather} />
        </aside>
      </section>

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

      <Toast message={toast} />
    </main>
  )
}
