import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import {
  clearRoomSession,
  closeVoting,
  completeRoom,
  createRoom,
  fetchRoom,
  joinRoom,
  loadRoomSession,
  saveVotes,
  addRoomCandidates,
  removeRoomCandidate,
  setMemberReady,
  startRoomSpin,
  sendRoomNudge,
  renameRoomMember,
} from '../services/lunchRoomService'

export function useLunchRoom(teamId) {
  const [session, setSession] = useState(loadRoomSession)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!session?.code) return null
    try {
      const next = await fetchRoom(session.code)
      setRoom(next)
      setError(null)
      return next
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [session?.code])

  useEffect(() => {
    if (!session?.code) return undefined
    refresh()
    const supabase = getSupabase()
    const channel = supabase
      .channel(`lunch-room:${session.code}`)
      .on('broadcast', { event: 'room_changed' }, refresh)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        refresh()
        channel
          .send({
            type: 'broadcast',
            event: 'room_changed',
            payload: { type: 'member_connected' },
          })
          .catch(() => {})
      })
    channelRef.current = channel
    const timer = setInterval(refresh, 15000)
    return () => {
      clearInterval(timer)
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [session?.code, refresh])

  function notifyRoomChanged(type) {
    const channel = channelRef.current
    if (!channel) return
    channel.send({
      type: 'broadcast',
      event: 'room_changed',
      payload: { type },
    }).catch(() => {})
  }

  async function run(action) {
    setLoading(true)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const create = (nickname, setup) =>
    run(async () => {
      const next = await createRoom(teamId, nickname, setup)
      setSession(next)
      setRoom(await fetchRoom(next.code))
      return next
    })

  const join = (code, nickname) =>
    run(async () => {
      const next = await joinRoom(code, nickname)
      setSession(next)
      setRoom(await fetchRoom(next.code))
      notifyRoomChanged('member_joined')
      return next
    })

  const vote = (likes, veto) =>
    run(async () => {
      await saveVotes(session, likes, veto)
      const next = await refresh()
      notifyRoomChanged('votes_changed')
      return next
    })

  const setReady = (isReady, likes, veto) =>
    run(async () => {
      await setMemberReady(session, isReady, likes, veto)
      const next = await refresh()
      notifyRoomChanged('ready_changed')
      return next
    })

  const close = () =>
    run(async () => {
      await closeVoting(session)
      const next = await refresh()
      notifyRoomChanged('voting_closed')
      return next
    })

  const startSpin = () =>
    run(async () => {
      const result = await startRoomSpin(session)
      await refresh()
      notifyRoomChanged('spin_started')
      return result
    })

  const nudge = () =>
    run(async () => {
      await sendRoomNudge(session)
      const next = await refresh()
      notifyRoomChanged('nudge_sent')
      return next
    })

  const rename = (nickname) =>
    run(async () => {
      await renameRoomMember(session, nickname)
      const next = await refresh()
      notifyRoomChanged('member_renamed')
      return next
    })

  const complete = (menuId) =>
    run(async () => {
      await completeRoom(session, menuId)
      const next = await refresh()
      notifyRoomChanged('spin_completed')
      return next
    })

  const addCandidates = (candidates) =>
    run(async () => {
      await addRoomCandidates(session, candidates)
      const next = await refresh()
      notifyRoomChanged('candidates_changed')
      return next
    })

  const removeCandidate = (candidateId) =>
    run(async () => {
      await removeRoomCandidate(session, candidateId)
      const next = await refresh()
      notifyRoomChanged('candidates_changed')
      return next
    })

  function leave() {
    clearRoomSession()
    setSession(null)
    setRoom(null)
    setError(null)
  }

  return {
    session,
    room,
    loading,
    error,
    create,
    join,
    vote,
    setReady,
    close,
    startSpin,
    nudge,
    rename,
    complete,
    addCandidates,
    removeCandidate,
    leave,
    refresh,
  }
}
