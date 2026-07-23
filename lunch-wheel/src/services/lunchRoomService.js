import { getSupabase } from '../lib/supabase'

const CLIENT_ID_KEY = 'lunch-wheel-room-client-id'
const SESSION_KEY = 'lunch-wheel-room-session'

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

export function saveRoomSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearRoomSession() {
  localStorage.removeItem(SESSION_KEY)
}

async function rpc(name, params) {
  const { data, error } = await getSupabase().rpc(name, params)
  if (error) throw error
  return data
}

export async function createRoom(teamId, nickname, setup) {
  if (setup.locationMode === 'NONE') {
    const session = await rpc('create_empty_lunch_room', {
      p_team_id: teamId,
      p_nickname: nickname,
      p_client_id: getRoomClientId(),
    })
    saveRoomSession(session)
    return session
  }
  const session = await rpc('create_lunch_room_v2', {
    p_team_id: teamId,
    p_nickname: nickname,
    p_client_id: getRoomClientId(),
    p_location_mode: setup.locationMode,
    p_location_label: setup.locationLabel || null,
    p_latitude: setup.latitude || null,
    p_longitude: setup.longitude || null,
    p_radius_meters: setup.radiusMeters || null,
    p_candidates: setup.candidates,
  })
  saveRoomSession(session)
  return session
}

export async function joinRoom(code, nickname) {
  const session = await rpc('join_lunch_room', {
    p_code: code,
    p_nickname: nickname,
    p_client_id: getRoomClientId(),
  })
  saveRoomSession(session)
  return session
}

export function fetchRoom(code) {
  return rpc('get_lunch_room_v2', { p_code: code })
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

export function closeVoting(session) {
  return rpc('close_lunch_room_voting_v2', {
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
