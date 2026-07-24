import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSuspenseLanding,
  stepPointerSpring,
  stableSpinRandom,
  wheelReboundOffset,
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

test('포인터 스프링은 충격 후 감쇠하며 원점으로 돌아온다', () => {
  let state = stepPointerSpring(
    { angle: 0, velocity: 0 },
    1 / 60,
    { impulse: 180 },
  )
  assert.ok(state.angle > 0)
  for (let index = 0; index < 180; index += 1) {
    state = stepPointerSpring(state, 1 / 60)
  }
  assert.ok(Math.abs(state.angle) < 0.01)
})

test('경계 직전 정지에서만 바퀴의 작은 탄성 반동이 생긴다', () => {
  const boundary = {
    mode: 'boundary',
    boundaryClearance: 0.1,
  }
  assert.notEqual(wheelReboundOffset(0.9125, boundary), 0)
  assert.equal(wheelReboundOffset(1, boundary), 0)
  assert.equal(wheelReboundOffset(0.925, { mode: 'center' }), 0)
})

test('점심방 정지 난수는 같은 키에서 재현된다', () => {
  const key = 'winner-id:2026-07-24T12:00:00Z'
  assert.equal(stableSpinRandom(key), stableSpinRandom(key))
  assert.notEqual(stableSpinRandom(key), stableSpinRandom(`${key}:other`))
})
