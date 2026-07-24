import { expect, test } from '@playwright/test'

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(
    dimensions.scrollWidth,
    `horizontal overflow: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

async function openTeamMode(page) {
  await page.getByRole('button', { name: '양재역 주변' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.route('https://api.bigdatacloud.net/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        locality: '서울',
        principalSubdivision: '서울특별시',
      }),
    })
  })
  await page.route('**/api/places/nearby', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        places: [
          {
            placeId: 'korean-1',
            placeName: '든든한 국밥',
            rating: 4.5,
            ratingCount: 120,
            primaryType: 'korean_restaurant',
            types: ['korean_restaurant', 'restaurant', 'food'],
          },
          {
            placeId: 'japanese-1',
            placeName: '오늘의 라멘',
            rating: 4.4,
            ratingCount: 80,
            primaryType: 'ramen_restaurant',
            types: ['ramen_restaurant', 'japanese_restaurant', 'restaurant'],
          },
        ],
      }),
    })
  })
  await page.route('https://api.open-meteo.com/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          temperature_2m: 24,
          apparent_temperature: 25,
          relative_humidity_2m: 55,
          precipitation: 0,
          rain: 0,
          snowfall: 0,
          weather_code: 1,
          wind_speed_10m: 6,
          time: '2026-07-24T12:00',
        },
      }),
    })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '식사가챠' })).toBeVisible({
    timeout: 15000,
  })
})

test('switches between all decision modes', async ({ page }) => {
  const teamMode = page.getByRole('button', { name: '양재역 주변' })
  const roomMode = page.getByRole('button', { name: '같이 고르기' })
  const nearbyMode = page.getByRole('button', { name: '내 주변', exact: true })

  await expect(roomMode).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('heading', { name: '어디를 기준으로 고를까요?' }),
  ).toBeVisible()

  await teamMode.click()
  await expect(teamMode).toHaveAttribute('aria-pressed', 'true')

  await nearbyMode.click()
  await expect(nearbyMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: '내 주변 설정' })).toBeVisible()

  await teamMode.click()
  await expect(teamMode).toHaveAttribute('aria-pressed', 'true')
})

test('opens and closes the menu manager with the keyboard', async ({ page }) => {
  await openTeamMode(page)
  const manageButton = page.getByRole('button', { name: '메뉴 관리' })
  await manageButton.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: '메뉴 관리' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('filters nearby places by Google food category', async ({ page }) => {
  await page.getByRole('button', { name: '내 주변', exact: true }).click()
  await page.getByRole('button', { name: '위치 다시 확인' }).click()
  await expect(page.locator('.nearby-location-main strong').first()).toHaveText(
    '서울 · 서울특별시',
  )
  await page.getByRole('button', { name: '주변 식당 불러오기' }).click()

  const koreanCategory = page.getByRole('button', { name: '한식 1' })
  await expect(koreanCategory).toBeVisible()
  await expect(page.getByRole('button', { name: '일식 1' })).toBeVisible()
  await koreanCategory.click()
  await expect(koreanCategory).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('찾은 식당 1곳')).toBeVisible()
})

test('keeps the primary page within the viewport', async ({ page }) => {
  await openTeamMode(page)
  await expectNoHorizontalOverflow(page)

  const spinButton = page.getByRole('button', { name: /돌림판 돌리기|다시 돌리기/ })
  await expect(spinButton).toBeVisible()

  const box = await spinButton.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
})

test('keeps secondary panels collapsible on mobile', async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width || 1000) > 640)
  await openTeamMode(page)

  const toggle = page
    .getByRole('button')
    .filter({ hasText: '오늘 제외할 메뉴' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('searchbox', { name: '메뉴 목록 검색' })).toBeVisible()
})

test('persists the recent-result weighting preference', async ({ page }, testInfo) => {
  await openTeamMode(page)
  if ((testInfo.project.use.viewport?.width || 1000) <= 640) {
    await page
      .getByRole('button')
      .filter({ hasText: '최근 결과' })
      .click()
  }

  const preference = page.getByRole('switch', {
    name: '최근 메뉴 덜 나오게',
  })
  await page.getByText('최근 메뉴 덜 나오게', { exact: true }).click()
  await expect(preference).toBeChecked()
  await page.reload()
  await openTeamMode(page)
  if ((testInfo.project.use.viewport?.width || 1000) <= 640) {
    await page
      .getByRole('button')
      .filter({ hasText: '최근 결과' })
      .click()
  }
  await expect(preference).toBeChecked()
})

test('downloads an image card when file sharing is unavailable', async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width || 0) <= 640)
  await openTeamMode(page)

  await page.getByRole('button', { name: '돌림판 돌리기' }).click()
  const shareButton = page.getByRole('button', { name: '결과 공유하기' })
  await expect(shareButton).toBeVisible({ timeout: 10000 })

  const downloadPromise = page.waitForEvent('download')
  await shareButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^식사가챠-결과-\d{4}-\d{2}-\d{2}\.png$/)
})
