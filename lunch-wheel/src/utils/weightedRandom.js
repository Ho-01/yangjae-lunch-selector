/**
 * @param {{ weight: number }[]} items
 * @param {() => number} [random]
 */
export function weightedPick(items, random = Math.random) {
  if (!items.length) return null
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let r = random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}
