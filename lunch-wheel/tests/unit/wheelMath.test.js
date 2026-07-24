import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSuspenseLanding,
  findSegmentAtPointer,
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

test('세그먼트 전체 안전 범위에 균등한 정지 위치를 만든다', () => {
  const segment = { start: 0, end: 1, center: 0.5 }
  assert.equal(createSuspenseLanding(segment, 0).targetAngle, 0.04)
  assert.equal(createSuspenseLanding(segment, 0.5).targetAngle, 0.5)
  assert.ok(createSuspenseLanding(segment, 0.999999).targetAngle < 0.96)
})

test('점심방 정지 난수는 같은 키에서 재현된다', () => {
  const key = 'winner-id:2026-07-24T12:00:00Z'
  assert.equal(stableSpinRandom(key), stableSpinRandom(key))
  assert.notEqual(stableSpinRandom(key), stableSpinRandom(`${key}:other`))
})

test('포인터가 가리키는 세그먼트 변경을 감지한다', () => {
  const segments = [
    { id: 'a', start: 0, end: Math.PI },
    { id: 'b', start: Math.PI, end: Math.PI * 2 },
  ]
  assert.equal(findSegmentAtPointer(segments, 0, 0)?.id, 'a')
  assert.equal(findSegmentAtPointer(segments, 0, Math.PI)?.id, 'b')
})
