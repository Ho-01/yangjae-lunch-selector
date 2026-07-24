import test from 'node:test'
import assert from 'node:assert/strict'
import { getWeightedMenus } from '../../src/utils/weatherWeights.js'

const coldWeather = {
  feels: 3,
  temp: 4,
  precipitation: 0,
  rain: 0,
  snowfall: 0,
  code: 0,
  humidity: 40,
  wind: 5,
}

test('음식 카테고리가 아니라 날씨 프로필로 확률을 계산한다', () => {
  const [menu] = getWeightedMenus(
    [
      {
        id: 'ramen',
        name: '라멘',
        food_category: { id: 'japanese', label: '일식' },
        weather_profile: {
          code: 'hot_soup',
          weight_config: { base: 1, very_cold: 1.4 },
        },
      },
    ],
    new Set(),
    coldWeather,
  )

  assert.equal(menu.weight, 1.4)
})

test('내 주변의 중립 날씨 프로필은 카테고리와 무관하게 같은 확률이다', () => {
  const menus = ['korean', 'japanese'].map((category, index) => ({
    id: String(index),
    name: category,
    food_category: { id: category },
    weather_profile: {
      code: 'neutral',
      weight_config: { base: 1 },
    },
  }))

  assert.deepEqual(
    getWeightedMenus(menus, new Set(), coldWeather).map((menu) => menu.weight),
    [1, 1],
  )
})

