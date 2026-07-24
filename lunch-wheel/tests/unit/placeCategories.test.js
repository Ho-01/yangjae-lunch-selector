import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GOOGLE_FOOD_PRIMARY_TYPES,
  GOOGLE_TYPE_TO_PLACE_CATEGORY,
  PLACE_CATEGORY_DEFINITIONS,
} from '../../src/constants/placeCategories.js'
import { classifyGooglePlace } from '../../src/utils/placeCategories.js'

test('공식 Google 식음료 타입 스냅샷을 모두 앱 카테고리로 분류한다', () => {
  const categoryIds = new Set(
    PLACE_CATEGORY_DEFINITIONS.map((category) => category.id),
  )

  assert.deepEqual(
    GOOGLE_FOOD_PRIMARY_TYPES.filter(
      (type) => !GOOGLE_TYPE_TO_PLACE_CATEGORY[type],
    ),
    [],
  )
  assert.deepEqual(
    Object.entries(GOOGLE_TYPE_TO_PLACE_CATEGORY)
      .filter(([, categoryId]) => !categoryIds.has(categoryId))
      .map(([type]) => type),
    [],
  )
})

test('기본 타입이 일반적이면 더 구체적인 types 값을 우선 활용한다', () => {
  assert.deepEqual(
    classifyGooglePlace({
      primaryType: 'restaurant',
      types: ['restaurant', 'korean_restaurant', 'food'],
    }),
    {
      id: 'korean',
      label: '한식',
      iconKey: 'bowl',
      matchedType: 'korean_restaurant',
    },
  )
})

test('알 수 없거나 비어 있는 외부 타입은 안전하게 기타로 분류한다', () => {
  assert.deepEqual(classifyGooglePlace({ primaryType: 'new_food_type' }), {
    id: 'other',
    label: '기타',
    iconKey: 'utensils',
    matchedType: null,
  })
  assert.deepEqual(classifyGooglePlace(), {
    id: 'other',
    label: '기타',
    iconKey: 'utensils',
    matchedType: null,
  })
})
