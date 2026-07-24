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
      mode: 'center',
      pointerDirection: 0,
    }
  }

  const random = Math.max(0, Math.min(0.999999, randomValue))
  if (random < 0.3) {
    const centerJitter = ((random / 0.3) - 0.5) * arc * 0.18
    return {
      targetAngle: segment.center + centerJitter,
      mode: 'center',
      pointerDirection: 0,
    }
  }

  if (random < 0.6) {
    const position = 0.28 + ((random - 0.3) / 0.3) * 0.44
    return {
      targetAngle: segment.start + arc * position,
      mode: 'regular',
      pointerDirection: 0,
    }
  }

  const sideProgress = (random - 0.6) / 0.4
  const inset = arc * (0.05 + sideProgress * 0.07)
  return {
    targetAngle: segment.start + inset,
    mode: 'boundary',
    pointerDirection: 1,
    boundaryClearance: inset,
  }
}

export function stepPointerSpring(
  state,
  deltaSeconds,
  { target = 0, impulse = 0 } = {},
) {
  const dt = Math.max(0, Math.min(0.034, deltaSeconds))
  const acceleration =
    150 * (target - state.angle) - 18 * state.velocity
  const velocity = state.velocity + acceleration * dt + impulse
  return {
    angle: state.angle + velocity * dt,
    velocity,
  }
}

export function wheelReboundOffset(progress, landing) {
  if (landing.mode !== 'boundary' || progress <= 0.9 || progress >= 1) {
    return 0
  }
  const reboundProgress = (progress - 0.9) / 0.1
  const amplitude = Math.min(landing.boundaryClearance * 0.22, 0.012)
  return (
    -Math.sin(reboundProgress * Math.PI * 4) *
    (1 - reboundProgress) *
    amplitude
  )
}
