import { WHEEL_COLORS } from '../constants/app'

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
