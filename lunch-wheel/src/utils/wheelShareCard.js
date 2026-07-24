function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fill()
}

function fitText(ctx, text, maxWidth) {
  let value = String(text || '')
  while (value.length > 1 && ctx.measureText(value).width > maxWidth) {
    value = `${value.slice(0, -2)}…`
  }
  return value
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(' ')
  const lines = []
  let line = ''
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      line = word
    }
  })
  if (line) lines.push(line)
  lines.slice(0, maxLines).forEach((value, index) => {
    const output =
      index === maxLines - 1 && lines.length > maxLines
        ? fitText(ctx, `${value}…`, maxWidth)
        : value
    ctx.fillText(output, x, y + index * lineHeight)
  })
}

function modeLabel(mode) {
  if (mode === 'nearby') return '내 주변 식당'
  return '나의 점심 후보'
}

export async function createWheelResultImage({
  result,
  items,
  mode,
  locationLabel,
}) {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  const total = items.reduce((sum, item) => sum + item.weight, 0) || 1
  const ranked = [...items]
    .map((item) => ({ ...item, probability: (item.weight / total) * 100 }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5)

  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#171717'
  ctx.fillRect(0, 0, canvas.width, 28)

  ctx.fillStyle = '#171717'
  ctx.font = '900 48px Pretendard, sans-serif'
  ctx.fillText('식사가챠', 72, 105)
  ctx.fillStyle = '#262626'
  ctx.font = '800 30px Pretendard, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(fitText(ctx, locationLabel || modeLabel(mode), 480), 1008, 104)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(60,60,60,.12)'
  ctx.shadowBlur = 28
  roundedRect(ctx, 60, 155, 960, 390, 36)
  ctx.shadowBlur = 0

  ctx.fillStyle = '#777777'
  ctx.font = '800 28px Pretendard, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('오늘의 점심은', 540, 235)
  ctx.fillStyle = '#171717'
  ctx.font = '900 82px Pretendard, sans-serif'
  ctx.fillText(fitText(ctx, result.name, 850), 540, 345)
  ctx.fillStyle = '#262626'
  ctx.font = '800 25px Pretendard, sans-serif'
  wrapText(ctx, result.message, 540, 420, 850, 36, 2)
  ctx.fillStyle = '#999999'
  ctx.font = '700 21px Pretendard, sans-serif'
  ctx.fillText(`${modeLabel(mode)} · 후보 ${items.length}개`, 540, 510)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#171717'
  ctx.font = '900 34px Pretendard, sans-serif'
  ctx.fillText('당첨 확률', 72, 615)

  ranked.forEach((item, index) => {
    const y = 655 + index * 108
    ctx.fillStyle = item.id === result.id ? '#f5f5f5' : '#ffffff'
    roundedRect(ctx, 60, y, 960, 86, 20)
    ctx.fillStyle = item.id === result.id ? '#262626' : '#171717'
    ctx.font = '900 29px Pretendard, sans-serif'
    ctx.fillText(fitText(ctx, item.name, 650), 92, y + 53)
    ctx.fillStyle = '#737373'
    ctx.font = '900 27px Pretendard, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${item.probability.toFixed(1)}%`, 978, y + 53)
    ctx.textAlign = 'left'
  })

  ctx.fillStyle = '#777777'
  ctx.font = '700 22px Pretendard, sans-serif'
  ctx.textAlign = 'center'
  wrapText(ctx, result.reason, 540, 1245, 900, 32, 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 생성 실패'))),
      'image/png',
    )
  })
}

export function downloadWheelResult(blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `식사가챠-결과-${new Date().toISOString().slice(0, 10)}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
