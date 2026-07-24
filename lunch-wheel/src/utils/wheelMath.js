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
      overshoot: 0,
    }
  }

  const random = Math.max(0, Math.min(0.999999, randomValue))
  const nearStart = random < 0.5
  const variation = (random * 2) % 1
  const inset = arc * (0.07 + variation * 0.09)
  const targetAngle = nearStart
    ? segment.start + inset
    : segment.end - inset

  return {
    targetAngle,
    // Positive rotation moves the pointer toward the segment start.
    overshoot: (nearStart ? 1 : -1) * (inset + Math.min(arc * 0.035, 0.018)),
  }
}

export function suspenseRotationOffset(progress, overshoot) {
  if (!overshoot || progress <= 0.84 || progress >= 1) return 0
  const lateProgress = (progress - 0.84) / 0.16
  return Math.sin(lateProgress * Math.PI) * overshoot
}
