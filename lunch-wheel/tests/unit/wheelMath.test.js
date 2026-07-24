import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSuspenseLanding,
  stableSpinRandom,
  suspenseRotationOffset,
} from '../../src/utils/wheelMath.js'

test('긴장감 정지 지점은 작은 세그먼트에서도 항상 경계 안쪽이다', () => {
  const segment = { start: 1, end: 1.01, center: 1.005 }
  for (let index = 0; index < 100; index += 1) {
    const landing = createSuspenseLanding(segment, index / 100)
    assert.ok(landing.targetAngle > segment.start)
    assert.ok(landing.targetAngle < segment.end)
  }
})

test('모션 감소 환경에서는 중앙에 정지하고 오버슈트하지 않는다', () => {
  const segment = { start: 0, end: 1, center: 0.5 }
  assert.deepEqual(createSuspenseLanding(segment, 0.01, true), {
    targetAngle: 0.5,
    overshoot: 0,
  })
})

test('오버슈트는 마지막 구간에만 발생하고 최종 위치는 0이다', () => {
  assert.equal(suspenseRotationOffset(0.8, 0.2), 0)
  assert.notEqual(suspenseRotationOffset(0.92, 0.2), 0)
  assert.equal(suspenseRotationOffset(1, 0.2), 0)
})

test('점심방 정지 난수는 같은 키에서 재현된다', () => {
  const key = 'winner-id:2026-07-24T12:00:00Z'
  assert.equal(stableSpinRandom(key), stableSpinRandom(key))
  assert.notEqual(stableSpinRandom(key), stableSpinRandom(`${key}:other`))
})
