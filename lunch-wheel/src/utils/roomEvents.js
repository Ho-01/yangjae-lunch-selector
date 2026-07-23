export function formatRoomEvent(event) {
  const actor = event?.actorNickname || '누군가'
  switch (event?.type) {
    case 'CANDIDATE_ADDED':
      return `${actor}님이 '${event.payload?.candidateName || '새 메뉴'}' 후보를 추가했어요.`
    case 'MEMBER_READY':
      return `${actor}님이 준비 완료했어요.`
    case 'MEMBER_UNREADY':
      return `${actor}님이 준비를 취소했어요.`
    case 'MEMBER_RENAMED':
      return `${event.payload?.oldNickname || actor}님이 '${event.payload?.newNickname || actor}'(으)로 이름을 바꿨어요.`
    case 'NUDGE_SENT':
      return `${actor}님이 아직 준비 전인 사람들을 재촉했어요.`
    default:
      return '점심방에 새로운 활동이 있어요.'
  }
}
