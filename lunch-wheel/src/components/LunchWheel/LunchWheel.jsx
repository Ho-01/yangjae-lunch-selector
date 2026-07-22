import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import WheelCanvas from './WheelCanvas'
import WeatherPanel from '../WeatherPanel'
import ResultCard from '../ResultCard'
import { UI_ICONS } from '../../constants/icons'
import { getWeightedMenus, weatherReason } from '../../utils/weatherWeights'
import { weightedPick } from '../../utils/weightedRandom'
import {
  buildSegments,
  easeOutQuint,
  normalizeAngle,
} from '../../utils/wheelMath'

export default function LunchWheel({
  team,
  menus,
  displayOrder,
  setDisplayOrder,
  excludedIds,
  weather,
  weatherLoading,
  weatherError,
  onRefreshWeather,
  spinning,
  setSpinning,
  onToast,
  disabledExtras,
}) {
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [spinLabel, setSpinLabel] = useState('돌림판 돌리기')
  const [itemsOverride, setItemsOverride] = useState(null)
  const segmentsRef = useRef([])
  const rotationRef = useRef(0)
  const rafRef = useRef(0)
  const ShuffleIcon = UI_ICONS.shuffle

  const orderedMenus = useMemo(() => {
    if (!displayOrder.length) return menus
    const byId = new Map(menus.map((menu) => [menu.id, menu]))
    const ordered = displayOrder
      .map((id) => byId.get(id))
      .filter(Boolean)
    const missing = menus.filter((menu) => !displayOrder.includes(menu.id))
    return [...ordered, ...missing]
  }, [menus, displayOrder])

  const weightedItems = useMemo(
    () => getWeightedMenus(orderedMenus, excludedIds, weather),
    [orderedMenus, excludedIds, weather],
  )

  const canvasItems = itemsOverride ?? weightedItems

  const handleSegmentsChange = useCallback((segments) => {
    segmentsRef.current = segments
  }, [])

  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function animateSpin(targetMenu, weatherSnapshot, segments) {
    const seg = segments.find((item) => item.id === targetMenu.id)
    if (!seg) {
      setSpinning(false)
      setItemsOverride(null)
      setSpinLabel('돌림판 돌리기')
      return
    }

    const pointerAngle = -Math.PI / 2
    const start = rotationRef.current
    const currentNorm = normalizeAngle(start)
    const targetNorm = normalizeAngle(pointerAngle - seg.center)
    let delta = targetNorm - currentNorm
    if (delta < 0) delta += Math.PI * 2

    const extraTurns = (6 + Math.floor(Math.random() * 3)) * Math.PI * 2
    const end = start + delta + extraTurns
    const duration = 4300
    const begin = performance.now()

    const frame = (now) => {
      const p = Math.min(1, (now - begin) / duration)
      const next = start + (end - start) * easeOutQuint(p)
      setRotation(next)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        setRotation(normalizeAngle(end))
        setSpinning(false)
        setItemsOverride(null)
        setSpinLabel('다시 돌리기')
        setResult({
          name: targetMenu.name,
          reason: weatherReason(targetMenu, weatherSnapshot),
          place_links: targetMenu.place_links || [],
        })
        if (navigator.vibrate) navigator.vibrate([60, 45, 90])
      }
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  async function handleSpin() {
    if (spinning) return
    if (!weightedItems.length) {
      onToast(
        menus.length
          ? '제외되지 않은 메뉴가 하나 이상 필요합니다.'
          : '활성 메뉴가 없습니다.',
      )
      return
    }

    setSpinning(true)
    setResult(null)
    setSpinLabel('현재 날씨 확인 중…')

    const latestWeather = await onRefreshWeather({ quiet: true })
    const items = getWeightedMenus(orderedMenus, excludedIds, latestWeather)

    if (!items.length) {
      setSpinning(false)
      setSpinLabel('돌림판 돌리기')
      onToast('활성 메뉴가 없습니다.')
      return
    }

    const segments = buildSegments(items)
    segmentsRef.current = segments
    setItemsOverride(items)

    const winner = weightedPick(items)
    setSpinLabel('돌아가는 중…')
    setTimeout(() => animateSpin(winner, latestWeather, segments), 180)
  }

  function handleShuffle() {
    if (spinning) return
    const shuffled = [...menus]
      .map((menu) => menu.id)
      .sort(() => Math.random() - 0.5)
    setDisplayOrder(shuffled)
    setRotation(0)
    onToast('돌림판 순서를 섞었습니다.')
  }

  return (
    <article className="card main-card">
      <WeatherPanel
        team={team}
        weather={weather}
        loading={weatherLoading}
        error={weatherError}
      />

      <div className="wheel-wrap">
        <div className="wheel-aura" />
        <div className="pointer" aria-hidden />
        <WheelCanvas
          items={canvasItems}
          rotation={rotation}
          onSegmentsChange={handleSegmentsChange}
        />
      </div>

      <div className="spin-area">
        <button
          type="button"
          className="spin-btn"
          disabled={spinning || disabledExtras}
          onClick={handleSpin}
          aria-label={spinLabel}
        >
          {spinLabel}
        </button>
        <button
          type="button"
          className="mini-btn"
          title="돌림판 메뉴 순서 섞기"
          aria-label="돌림판 메뉴 순서 섞기"
          disabled={spinning || disabledExtras}
          onClick={handleShuffle}
        >
          <ShuffleIcon className="ui-icon" aria-hidden />
          순서 섞기
        </button>
      </div>

      <ResultCard
        visible={Boolean(result)}
        menuName={result?.name}
        reason={result?.reason}
        placeLinks={result?.place_links}
      />
    </article>
  )
}
