import { getSupabase } from '../lib/supabase'
import { resolveRoomNickname } from '../utils/roomNickname'

const CLIENT_ID_KEY = 'lunch-wheel-room-client-id'
const SESSION_KEY = 'lunch-wheel-room-session'
const RECENT_SESSIONS_KEY = 'siksa-gacha-recent-room-sessions-v1'
const MAX_RECENT_ROOMS = 10

export function getRoomClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export function loadRoomSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function loadRecentRoomSessions() {
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_SESSIONS_KEY) || '[]')
    const legacy = loadRoomSession()
    const sessions = Array.isArray(recent) ? recent : []
    if (legacy?.code && !sessions.some((item) => item.code === legacy.code)) {
      sessions.unshift({
        ...legacy,
        joinedAt: new Date().toISOString(),
        lastVisitedAt: new Date().toISOString(),
      })
      localStorage.setItem(
        RECENT_SESSIONS_KEY,
        JSON.stringify(sessions.slice(0, MAX_RECENT_ROOMS)),
      )
    }
    return sessions.slice(0, MAX_RECENT_ROOMS)
  } catch {
    return []
  }
}

export function saveRoomSession(session, metadata = {}) {
  const now = new Date().toISOString()
  const next = {
    ...session,
    ...metadata,
    joinedAt: session.joinedAt || metadata.joinedAt || now,
    lastVisitedAt: now,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  const recent = loadRecentRoomSessions().filter(
    (item) => item.code !== next.code,
  )
  localStorage.setItem(
    RECENT_SESSIONS_KEY,
    JSON.stringify([next, ...recent].slice(0, MAX_RECENT_ROOMS)),
  )
  return next
}

export function clearRoomSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function removeRecentRoomSession(code) {
  const recent = loadRecentRoomSessions().filter((item) => item.code !== code)
  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(recent))
  if (loadRoomSession()?.code === code) clearRoomSession()
  return recent
}

async function rpc(name, params) {
  const { data, error } = await getSupabase().rpc(name, params)
  if (error) throw error
  return data
}

export async function createRoom(teamId, nickname, setup) {
  const resolvedNickname = resolveRoomNickname(nickname)
  if (setup.locationMode === 'NONE') {
    const session = await rpc('create_empty_lunch_room', {
      p_team_id: teamId,
      p_nickname: resolvedNickname,
      p_client_id: getRoomClientId(),
    })
    return saveRoomSession(session, { nickname: resolvedNickname })
  }
  const session = await rpc('create_lunch_room_v2', {
    p_team_id: teamId,
    p_nickname: resolvedNickname,
    p_client_id: getRoomClientId(),
    p_location_mode: setup.locationMode,
    p_location_label: setup.locationLabel || null,
    p_latitude: setup.latitude || null,
    p_longitude: setup.longitude || null,
    p_radius_meters: setup.radiusMeters || null,
    p_candidates: setup.candidates,
  })
  return saveRoomSession(session, { nickname: resolvedNickname })
}

export async function joinRoom(code, nickname) {
  const resolvedNickname = resolveRoomNickname(nickname)
  const session = await rpc('join_lunch_room', {
    p_code: code,
    p_nickname: resolvedNickname,
    p_client_id: getRoomClientId(),
  })
  return saveRoomSession(session, { nickname: resolvedNickname })
}

export async function resumeRoom(savedSession) {
  const summary = await rpc('resume_lunch_room', {
    p_code: savedSession.code,
    p_member_id: savedSession.memberId,
    p_token: savedSession.token,
  })
  return saveRoomSession(
    {
      ...savedSession,
      ...summary,
      token: savedSession.token,
    },
    summary,
  )
}

export async function fetchRecentRooms() {
  const sessions = loadRecentRoomSessions()
  return Promise.all(
    sessions.map(async (savedSession) => {
      try {
        const summary = await rpc('resume_lunch_room', {
          p_code: savedSession.code,
          p_member_id: savedSession.memberId,
          p_token: savedSession.token,
        })
        return { ...savedSession, ...summary, available: true }
      } catch (error) {
        const message = error?.message || '방 정보를 확인하지 못했습니다.'
        return {
          ...savedSession,
          available: false,
          unavailableReason: message.includes('ROOM_EXPIRED')
            ? '만료된 방'
            : message.includes('ROOM_SESSION_INVALID')
              ? '재입장 정보 만료'
              : '확인할 수 없는 방',
        }
      }
    }),
  )
}

export function renameRoomMember(session, nickname) {
  return rpc('rename_lunch_room_member', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
    p_nickname: nickname,
  })
}

export async function fetchRoom(code) {
  const room = await rpc('get_lunch_room_v2', { p_code: code })
  try {
    const events = await rpc('get_lunch_room_events', { p_code: code })
    return { ...room, events: events || [] }
  } catch {
    // Keep rooms usable during the short deploy window before this RPC exists.
    return { ...room, events: [] }
  }
}

export function saveVotes(session, likeMenuIds, vetoMenuId) {
  return rpc('save_lunch_room_candidate_votes', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
    p_like_candidate_ids: likeMenuIds,
    p_veto_candidate_id: vetoMenuId || null,
  })
}

export function setMemberReady(session, isReady, likeMenuIds, vetoMenuId) {
  return rpc('set_lunch_room_member_ready', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
    p_is_ready: isReady,
    p_like_candidate_ids: likeMenuIds || [],
    p_veto_candidate_id: vetoMenuId || null,
  })
}

export function closeVoting(session) {
  return rpc('close_lunch_room_voting_v2', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
  })
}

export function startRoomSpin(session) {
  return rpc('start_lunch_room_spin', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
  })
}

export function sendRoomNudge(session) {
  return rpc('send_lunch_room_nudge', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
  })
}

export function completeRoom(session, winnerMenuId) {
  return rpc('complete_lunch_room_v2', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
    p_winner_candidate_id: winnerMenuId,
  })
}

export function addRoomCandidates(session, candidates) {
  return rpc('add_lunch_room_candidates', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
    p_candidates: candidates,
  })
}

export function removeRoomCandidate(session, candidateId) {
  return rpc('remove_lunch_room_candidate', {
    p_code: session.code,
    p_member_id: session.memberId,
    p_token: session.token,
    p_candidate_id: candidateId,
  })
}
