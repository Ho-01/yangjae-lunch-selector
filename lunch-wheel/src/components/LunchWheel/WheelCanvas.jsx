import { useEffect, useRef } from 'react'
import { buildSegments } from '../../utils/wheelMath'

function drawWheel(canvas, items, rotation, onSegments) {
  if (!canvas) return []
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
  const cssSize = canvas.clientWidth || 560
  const px = Math.round(cssSize * dpr)
  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px
    canvas.height = px
  }

  const size = canvas.width
  const c = size / 2
  const radius = c - 18 * dpr
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(rotation)

  const segments = buildSegments(items)
  onSegments?.(segments)

  if (!items.length) {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#d4d4d4'
    ctx.fill()
    ctx.fillStyle = '#737373'
    ctx.font = `800 ${24 * dpr}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('메뉴를 하나 이상 활성화해주세요', 0, 0)
    ctx.restore()
    return segments
  }

  for (const seg of segments) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, seg.start, seg.end)
    ctx.closePath()
    ctx.fillStyle = seg.color
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,.86)'
    ctx.lineWidth = 2 * dpr
    ctx.stroke()

    const arcSize = seg.end - seg.start
    if (arcSize < 0.065) continue

    ctx.save()
    ctx.rotate(seg.center)
    ctx.translate(radius * 0.67, 0)

    const normalized = (seg.center + Math.PI * 2) % (Math.PI * 2)
    if (normalized > Math.PI / 2 && normalized < Math.PI * 1.5) {
      ctx.rotate(Math.PI)
    }

    const fontSize = Math.max(9, Math.min(15, arcSize * 110)) * dpr
    ctx.font = `900 ${fontSize}px Pretendard, system-ui, sans-serif`
    ctx.fillStyle = '#171717'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const maxChars = arcSize < 0.16 ? 5 : arcSize < 0.23 ? 8 : 12
    let text = seg.name
    if (text.length > maxChars) text = `${text.slice(0, maxChars - 1)}…`
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 7 * dpr
  ctx.stroke()
  ctx.restore()
  return segments
}

export default function WheelCanvas({
  items,
  rotation,
  onSegmentsChange,
  hubLabel = '메뉴',
  hubStatus = 'ready',
}) {
  const canvasRef = useRef(null)
  const segmentsRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    const segments = drawWheel(canvas, items, rotation, (next) => {
      segmentsRef.current = next
      onSegmentsChange?.(next)
    })
    segmentsRef.current = segments

    const onResize = () => {
      drawWheel(canvas, items, rotation, (next) => {
        segmentsRef.current = next
        onSegmentsChange?.(next)
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [items, rotation, onSegmentsChange])

  const hubContent =
    hubStatus === 'spinning'
      ? { title: '고르는 중', caption: '잠시만요' }
      : hubStatus === 'complete'
        ? { title: '선택 완료', caption: '결과를 확인하세요' }
        : items.length
          ? { title: `${hubLabel} ${items.length}`, caption: '돌릴 준비 완료' }
          : { title: `${hubLabel} 없음`, caption: '후보를 추가해주세요' }

  return (
    <div className="canvas-shell">
      <canvas
        ref={canvasRef}
        width={900}
        height={900}
        aria-label="점심 메뉴 돌림판"
      />
      <div className={`hub is-${hubStatus}`} aria-live="polite">
        <div className="hub-content">
          {hubStatus === 'spinning' ? (
            <span className="hub-spinner" aria-hidden />
          ) : null}
          <strong>{hubContent.title}</strong>
          <span>{hubContent.caption}</span>
        </div>
      </div>
    </div>
  )
}
