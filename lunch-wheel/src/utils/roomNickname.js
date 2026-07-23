const ADJECTIVES = ['든든한', '배고픈', '신나는', '느긋한', '용감한', '행복한']
const CHARACTERS = ['판다', '수달', '토끼', '호랑이', '고양이', '강아지']

export function createRoomNickname() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
  const number = String(Math.floor(Math.random() * 900) + 100)
  return `${adjective} ${character} ${number}`
}

export function resolveRoomNickname(nickname) {
  return nickname?.trim() || createRoomNickname()
}
