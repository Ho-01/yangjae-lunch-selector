import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import LunchWheel from './components/LunchWheel/LunchWheel'
import MenuExclusionList from './components/MenuExclusionList'
import MenuManagerDialog from './components/MenuManagerDialog'
import ProbabilityList from './components/ProbabilityList'
import { UI_ICONS } from './constants/icons'
import { useMenus } from './hooks/useMenus'
import { useDailyExclusions } from './hooks/useDailyExclusions'
import { useWeather } from './hooks/useWeather'
import { getWeightedMenus } from './utils/weatherWeights'

function Toast({ message }) {
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>
}

export default function App() {
  const {
    team,
    menuTypes,
    menus,
    excludedIds,
    setExcludedIds,
    loading,
    saving: menuSaving,
    error: dataError,
    addMenu,
    saveMenu,
    removeMenu,
    connectGooglePlace,
    disconnectGooglePlace,
  } = useMenus()

  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    refresh: refreshWeather,
  } = useWeather(team)

  const {
    saving: exclusionSaving,
    toggleExclusion,
    banAll,
    clearAll,
  } = useDailyExclusions({
    teamId: team?.id,
    menus,
    excludedIds,
    setExcludedIds,
  })

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
    if (!team) return
    refreshWeather()
  }, [team, refreshWeather])

  const weightedItems = useMemo(
    () => getWeightedMenus(menus, excludedIds, weather),
    [menus, excludedIds, weather],
  )

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }

  useEffect(() => {
    return () => clearTimeout(toastTimer.current)
  }, [])

  async function handleRefreshWeather() {
    const data = await refreshWeather()
    showToast(data ? '현재 날씨를 갱신했습니다.' : '날씨 연결에 실패했습니다.')
  }

  async function handleToggle(menuId, checked) {
    try {
      await toggleExclusion(menuId, checked)
    } catch (err) {
      console.error(err)
      showToast(err?.message || '제외 상태를 저장하지 못했습니다.')
    }
  }

  async function handleBanAll() {
    try {
      await banAll()
      showToast('모든 메뉴를 제외했습니다.')
    } catch (err) {
      console.error(err)
      showToast(err?.message || '제외 상태를 저장하지 못했습니다.')
    }
  }

  async function handleClearAll() {
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

  const busy = spinning || menuSaving || exclusionSaving
  const location = team?.location_name || '양재역'

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
          <div className="eyebrow">{location} 기준 · 현재 날씨 반영</div>
          <h1>오늘 뭐 먹지?</h1>
          <p className="subtitle">
            현재 날씨와 메뉴 성격을 반영해 후보별 확률을 조정합니다.
          </p>
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="btn ghost"
            disabled={busy || weatherLoading}
            onClick={handleRefreshWeather}
            aria-label="날씨 새로고침"
          >
            <RefreshIcon className="ui-icon" aria-hidden />
            날씨 새로고침
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
        </div>
      </header>

      <section className="layout">
        <LunchWheel
          team={team}
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
          disabledExtras={menuSaving || exclusionSaving}
        />

        <aside className="side">
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
        현재 날씨: Open-Meteo API · 위치 기준: {location}(
        {team.weather_latitude}, {team.weather_longitude})
        <br />
        메뉴와 오늘 제외 상태는 Supabase에 저장됩니다.
        {/* TEMP: anon RLS — Auth 도입 전 임시 정책 */}
      </footer>

      <MenuManagerDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        menus={menus}
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
