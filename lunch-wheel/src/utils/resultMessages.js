const RESULT_MESSAGES = [
  "🎉 축하합니다! 오늘의 희생 메뉴는 '{menu}'입니다.",
  "🍜 운명이 '{menu}'을(를) 선택했습니다. 항의는 받지 않습니다.",
  "😎 룰렛이 책임집니다. 오늘은 '{menu}' 맛있게 드세요.",
  "💀 다시 돌리기? '{menu}'을(를) 두고 그러는 건 비겁한 선택입니다.",
  "🔥 오늘의 점심은 이미 정해져 있었습니다. 바로 '{menu}'!",
]

let lastMessageIndex = -1

export function pickResultMessage(menuName) {
  const choices = RESULT_MESSAGES.map((_, index) => index).filter(
    (index) => index !== lastMessageIndex,
  )
  const index = choices[Math.floor(Math.random() * choices.length)] ?? 0
  lastMessageIndex = index
  return RESULT_MESSAGES[index].replaceAll('{menu}', menuName)
}

