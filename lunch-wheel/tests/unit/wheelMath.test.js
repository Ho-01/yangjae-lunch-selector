import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSuspenseLanding,
  pointerDeflectionDegrees,
  stableSpinRandom,
} from '../../src/utils/wheelMath.js'

test('긴장감 정지 지점은 작은 세그먼트에서도 항상 경계 안쪽이다', () => {
  const segment = { start: 1, end: 1.01, center: 1.005 }
  for (let index = 0; index < 100; index += 1) {
    const landing = createSuspenseLanding(segment, index / 100)
    assert.ok(landing.targetAngle > segment.start)
    assert.ok(landing.targetAngle < segment.end)
  }
})

test('모션 감소 환경에서는 중앙에 정지한다', () => {
  const segment = { start: 0, end: 1, center: 0.5 }
  assert.deepEqual(createSuspenseLanding(segment, 0.01, true), {
    targetAngle: 0.5,
    mode: 'center',
    pointerDirection: 0,
  })
})

test('중앙·일반·경계 직전 정지가 모두 발생한다', () => {
  const segment = { start: 0, end: 1, center: 0.5 }
  assert.equal(createSuspenseLanding(segment, 0.1).mode, 'center')
  assert.equal(createSuspenseLanding(segment, 0.45).mode, 'regular')
  assert.equal(createSuspenseLanding(segment, 0.7).mode, 'boundary')
})

test('경계 직전에는 포인터만 크게 휘고 최종 상태에서 복원된다', () => {
  const landing = {
    mode: 'boundary',
    pointerDirection: 1,
  }
  assert.ok(Math.abs(pointerDeflectionDegrees(0.89, landing)) > 15)
  assert.equal(pointerDeflectionDegrees(1, landing), 0)
})

test('점심방 정지 난수는 같은 키에서 재현된다', () => {
  const key = 'winner-id:2026-07-24T12:00:00Z'
  assert.equal(stableSpinRandom(key), stableSpinRandom(key))
  assert.notEqual(stableSpinRandom(key), stableSpinRandom(`${key}:other`))
})
