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

export async function createRoomResultImage(room) {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  const winner = room.menus.find((menu) => menu.id === room.winnerMenuId)
  const finalistIds = new Set(room.candidateMenuIds || [])
  const finalists = room.menus.filter((menu) => finalistIds.has(menu.id))
  const probability = finalists.length ? 100 / finalists.length : 0

  ctx.fillStyle = '#f7fff2'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#58cc02'
  ctx.fillRect(0, 0, canvas.width, 28)

  ctx.fillStyle = '#3c3c3c'
  ctx.font = '900 48px Pretendard, sans-serif'
  ctx.fillText('오늘 뭐 먹지?', 72, 105)
  ctx.fillStyle = '#58a700'
  ctx.font = '800 30px Pretendard, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(room.locationLabel || '같이 고른 점심', 1008, 104)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(60,60,60,.12)'
  ctx.shadowBlur = 28
  roundedRect(ctx, 60, 155, 960, 350, 36)
  ctx.shadowBlur = 0

  ctx.fillStyle = '#777777'
  ctx.font = '800 28px Pretendard, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🎉 오늘의 점심은', 540, 235)
  ctx.fillStyle = '#3c3c3c'
  ctx.font = '900 82px Pretendard, sans-serif'
  ctx.fillText(fitText(ctx, winner?.name || '결과 확인 중', 850), 540, 345)
  ctx.fillStyle = '#58a700'
  ctx.font = '800 27px Pretendard, sans-serif'
  ctx.fillText(`${room.members.length}명이 함께 결정했어요`, 540, 420)
  ctx.fillStyle = '#999999'
  ctx.font = '700 22px Pretendard, sans-serif'
  ctx.fillText(`방 코드 ${room.code}`, 540, 465)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#3c3c3c'
  ctx.font = '900 34px Pretendard, sans-serif'
  ctx.fillText('최종 후보', 72, 575)

  finalists.forEach((menu, index) => {
    const y = 615 + index * 145
    ctx.fillStyle = menu.id === winner?.id ? '#efffe5' : '#ffffff'
    roundedRect(ctx, 60, y, 960, 118, 24)
    ctx.fillStyle = menu.id === winner?.id ? '#58a700' : '#3c3c3c'
    ctx.font = '900 34px Pretendard, sans-serif'
    ctx.fillText(fitText(ctx, menu.name, 570), 92, y + 48)
    ctx.fillStyle = '#777777'
    ctx.font = '700 22px Pretendard, sans-serif'
    ctx.fillText(`좋아요 ${menu.likeCount} · 제외 ${menu.vetoCount}`, 92, y + 86)
    ctx.fillStyle = '#1cb0f6'
    ctx.font = '900 30px Pretendard, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${probability.toFixed(finalists.length === 3 ? 1 : 0)}%`, 978, y + 70)
    ctx.textAlign = 'left'
  })

  const memberY = 615 + Math.max(3, finalists.length) * 145 + 35
  ctx.fillStyle = '#3c3c3c'
  ctx.font = '900 32px Pretendard, sans-serif'
  ctx.fillText('함께 고른 사람들', 72, memberY)
  ctx.fillStyle = '#777777'
  ctx.font = '750 26px Pretendard, sans-serif'
  const memberNames = room.members
    .map((member) => `${member.isHost ? '👑 ' : ''}${member.nickname}`)
    .join('  ·  ')
  ctx.fillText(fitText(ctx, memberNames, 930), 72, memberY + 50)

  ctx.fillStyle = '#58cc02'
  ctx.font = '900 29px Pretendard, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('결과에 승복하고 맛있게 먹기 🤝', 540, 1280)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 생성 실패'))),
      'image/png',
    )
  })
}

export function downloadRoomResult(blob, code) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `오늘-점심-${code}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

