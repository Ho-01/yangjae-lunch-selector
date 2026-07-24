import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import WheelCanvas from './WheelCanvas'
import WeatherPanel from '../WeatherPanel'
import ResultCard from '../ResultCard'
import { UI_ICONS } from '../../constants/icons'
import { getWeightedMenus, weatherReason } from '../../utils/weatherWeights'
import { weightedPick } from '../../utils/weightedRandom'
import { pickResultMessage } from '../../utils/resultMessages'
import {
  createWheelResultImage,
  downloadWheelResult,
} from '../../utils/wheelShareCard'
import {
  buildSegments,
  createSuspenseLanding,
  easeOutQuint,
  normalizeAngle,
  pointerDeflectionDegrees,
  stableSpinRandom,
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
  onSpinComplete,
  onRequestSpin,
  remoteSpin,
  ignoreWeather = false,
  weatherWeightEnabled = true,
  recentMenuIds = [],
  reduceRecent = false,
  onResult,
  shareLocationLabel,
  wheelMode = 'team',
  disabledLabel,
  disabledExtras,
}) {
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [spinLabel, setSpinLabel] = useState('돌림판 돌리기')
  const [itemsOverride, setItemsOverride] = useState(null)
  const [pointerDeflection, setPointerDeflection] = useState(0)
  const segmentsRef = useRef([])
  const rotationRef = useRef(0)
  const rafRef = useRef(0)
  const remoteSpinRef = useRef('')
  const weightedItemsRef = useRef([])
  const ShuffleIcon = UI_ICONS.shuffle

  async function handleShareResult() {
    if (!result) return
    try {
      const blob = await createWheelResultImage({
        result,
        items: result.items,
        mode: wheelMode,
        locationLabel: shareLocationLabel || team?.location_name || team?.name,
      })
      const file = new File([blob], '식사가챠-결과.png', {
        type: 'image/png',
      })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: '식사가챠 결과',
          text: result.message,
          files: [file],
        })
        return
      }
      downloadWheelResult(blob)
      onToast('공유 대신 결과 이미지를 저장했어요.')
    } catch (err) {
      if (err?.name !== 'AbortError') {
        onToast('결과 이미지를 공유하지 못했어요.')
      }
    }
  }

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
    () =>
      getWeightedMenus(
        orderedMenus,
        excludedIds,
        ignoreWeather || !weatherWeightEnabled ? null : weather,
        { recentMenuIds, reduceRecent },
      ),
    [
      orderedMenus,
      excludedIds,
      weather,
      ignoreWeather,
      weatherWeightEnabled,
      recentMenuIds,
      reduceRecent,
    ],
  )
  weightedItemsRef.current = weightedItems

  const canvasItems = itemsOverride ?? weightedItems
  const hubLabel =
    wheelMode === 'nearby' ? '식당' : wheelMode === 'room' ? '후보' : '메뉴'
  const hubStatus = spinning
    ? 'spinning'
    : result || disabledLabel === '결정 완료'
      ? 'complete'
      : 'ready'

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

  function animateSpin(
    targetMenu,
    weatherSnapshot,
    segments,
    duration = 4300,
    landingRandom = Math.random(),
  ) {
    const seg = segments.find((item) => item.id === targetMenu.id)
    if (!seg) {
      setSpinning(false)
      setItemsOverride(null)
      setPointerDeflection(0)
      setSpinLabel('돌림판 돌리기')
      return
    }

    const pointerAngle = -Math.PI / 2
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const landing = createSuspenseLanding(
      seg,
      landingRandom,
      reducedMotion,
    )
    const start = rotationRef.current
    const currentNorm = normalizeAngle(start)
    const targetNorm = normalizeAngle(pointerAngle - landing.targetAngle)
    let delta = targetNorm - currentNorm
    if (delta < 0) delta += Math.PI * 2

    const extraTurns =
      (reducedMotion ? 1 : 6 + Math.floor(Math.random() * 3)) * Math.PI * 2
    const end = start + delta + extraTurns
    const begin = performance.now()
    const actualDuration = reducedMotion ? Math.min(duration, 700) : duration

    const frame = (now) => {
      const p = Math.min(1, (now - begin) / actualDuration)
      const next = start + (end - start) * easeOutQuint(p)
      setRotation(next)
      setPointerDeflection(
        reducedMotion ? 0 : pointerDeflectionDegrees(p, landing),
      )
      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        setRotation(normalizeAngle(end))
        setPointerDeflection(0)
        setSpinning(false)
        setItemsOverride(null)
        setSpinLabel('다시 돌리기')
        const resultMessage = pickResultMessage(targetMenu.name)
        const resultReason =
          !weatherSnapshot && reduceRecent
            ? '날씨 가중치 없이 최근 3개 결과의 확률을 낮춰 추첨했어요.'
            : `${weatherReason(targetMenu, weatherSnapshot)}${
                reduceRecent
                  ? ' 최근 선택된 메뉴의 확률도 낮춰 공정하게 추첨했어요.'
                  : ''
              }`
        setResult({
          id: targetMenu.id,
          name: targetMenu.name,
          message: resultMessage.text,
          messageIconKey: resultMessage.iconKey,
          reason: ignoreWeather
            ? '함께 고른 최종 후보 중 룰렛이 선택했어요.'
            : resultReason,
          place_links: targetMenu.place_links || [],
          items: segments.map(({ id, name, weight }) => ({
            id,
            name,
            weight,
          })),
        })
        onResult?.(targetMenu)
        onSpinComplete?.(targetMenu)
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

    if (onRequestSpin) {
      try {
        await onRequestSpin()
      } catch (err) {
        onToast(err?.message || '룰렛을 시작하지 못했어요.')
      }
      return
    }

    setSpinning(true)
    setResult(null)
    setSpinLabel(
      ignoreWeather || !weatherWeightEnabled
        ? '룰렛 준비 중…'
        : '현재 날씨 확인 중…',
    )

    const latestWeather = ignoreWeather || !weatherWeightEnabled
      ? null
      : await onRefreshWeather({ quiet: true })
    const items = getWeightedMenus(orderedMenus, excludedIds, latestWeather, {
      recentMenuIds,
      reduceRecent,
    })

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

  useEffect(() => {
    if (!remoteSpin?.winnerId || !remoteSpin?.startedAt) return undefined
    const key = `${remoteSpin.winnerId}:${remoteSpin.startedAt}`
    if (remoteSpinRef.current === key) return undefined
    const spinItems = weightedItemsRef.current
    const winner = spinItems.find((item) => item.id === remoteSpin.winnerId)
    if (!winner) return undefined

    remoteSpinRef.current = key
    setResult(null)
    setSpinning(true)
    setSpinLabel('돌아가는 중…')
    const startedAt = new Date(remoteSpin.startedAt).getTime()
    const duration = remoteSpin.durationMs || 4300
    const delay = Math.max(0, startedAt - Date.now())
    const elapsed = Math.max(0, Date.now() - startedAt)
    const remaining = Math.max(700, duration - elapsed)
    const segments = buildSegments(spinItems)
    segmentsRef.current = segments
    setItemsOverride(spinItems)

    let animationStarted = false
    const timer = setTimeout(() => {
      animationStarted = true
      animateSpin(
        winner,
        null,
        segments,
        remaining,
        stableSpinRandom(key),
      )
    }, delay)
    return () => {
      clearTimeout(timer)
      if (!animationStarted) {
        remoteSpinRef.current = ''
        setSpinning(false)
        setItemsOverride(null)
        setPointerDeflection(0)
      }
    }
    // animateSpin reads the latest refs and stable state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    remoteSpin?.winnerId,
    remoteSpin?.startedAt,
    remoteSpin?.durationMs,
  ])

  return (
    <article className="card main-card">
      {!ignoreWeather ? (
        <WeatherPanel
          team={team}
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
        />
      ) : null}

      <div className="wheel-wrap">
        <div className="wheel-aura" />
        <div
          className="pointer"
          style={{ transform: `rotate(${pointerDeflection}deg)` }}
          aria-hidden
        />
        <WheelCanvas
          items={canvasItems}
          rotation={rotation}
          onSegmentsChange={handleSegmentsChange}
          hubLabel={hubLabel}
          hubStatus={hubStatus}
        />
      </div>

      <div className="spin-area">
        <button
          type="button"
          className="spin-btn"
          disabled={spinning || disabledExtras}
          onClick={handleSpin}
          aria-label={disabledExtras && disabledLabel ? disabledLabel : spinLabel}
        >
          {disabledExtras && disabledLabel ? disabledLabel : spinLabel}
        </button>
        <button
          type="button"
          className="mini-btn"
          title={onRequestSpin ? '점심방에서는 모두 같은 순서를 사용해요' : '돌림판 메뉴 순서 섞기'}
          aria-label={onRequestSpin ? '점심방 공통 순서 사용 중' : '돌림판 메뉴 순서 섞기'}
          disabled={spinning || disabledExtras || Boolean(onRequestSpin)}
          onClick={handleShuffle}
        >
          <ShuffleIcon className="ui-icon" aria-hidden />
          순서 섞기
        </button>
      </div>

      <ResultCard
        visible={Boolean(result)}
        menuName={result?.name}
        message={result?.message}
        messageIconKey={result?.messageIconKey}
        reason={result?.reason}
        placeLinks={result?.place_links}
        onShare={handleShareResult}
      />
    </article>
  )
}
