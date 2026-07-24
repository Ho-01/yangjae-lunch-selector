import { WHEEL_COLORS } from '../constants/app.js'

export function buildSegments(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0) || 1
  let angle = -Math.PI / 2
  return items.map((item, index) => {
    const arc = (item.weight / total) * Math.PI * 2
    const segment = {
      ...item,
      start: angle,
      end: angle + arc,
      center: angle + arc / 2,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length],
    }
    angle += arc
    return segment
  })
}

export function normalizeAngle(rad) {
  const full = Math.PI * 2
  return ((rad % full) + full) % full
}

export function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5)
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function stableSpinRandom(value) {
  let hash = 2166136261
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

export function createSuspenseLanding(segment, randomValue, reducedMotion = false) {
  const arc = Math.max(0, segment.end - segment.start)
  if (reducedMotion || arc === 0) {
    return {
      targetAngle: segment.center,
      mode: 'center',
      pointerDirection: 0,
    }
  }

  const random = Math.max(0, Math.min(0.999999, randomValue))
  const safeInset = arc * 0.04
  const usableArc = Math.max(0, arc - safeInset * 2)
  const position = safeInset + usableArc * random
  return {
    targetAngle: segment.start + position,
    mode:
      random < 0.15 || random > 0.85
        ? 'boundary'
        : random > 0.4 && random < 0.6
          ? 'center'
          : 'regular',
    pointerDirection: 0,
  }
}
