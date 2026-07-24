import { useCallback, useEffect, useRef, useState } from 'react'
import { backend } from '../backend'

const {
  clearRoomSession,
  closeVoting,
  completeRoom,
  createRoom,
  fetchRoom,
  joinRoom,
  loadRoomSession,
  fetchRecentRooms,
  removeRecentRoomSession,
  resumeRoom,
  saveVotes,
  addRoomCandidates,
  removeRoomCandidate,
  setMemberReady,
  startRoomSpin,
  sendRoomNudge,
  renameRoomMember,
  transferRoomHost,
  sendRoomMessage,
  fetchRoomMessages,
} = backend.rooms

export function useLunchRoom(teamId) {
  const [session, setSession] = useState(loadRoomSession)
  const [sessionValidated, setSessionValidated] = useState(
    () => !loadRoomSession(),
  )
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recentRooms, setRecentRooms] = useState([])
  const [recentLoading, setRecentLoading] = useState(false)
  const channelRef = useRef(null)

  const refreshRecentRooms = useCallback(async () => {
    setRecentLoading(true)
    try {
      const next = await fetchRecentRooms()
      setRecentRooms(next)
      return next
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshRecentRooms()
  }, [refreshRecentRooms])

  const refresh = useCallback(async () => {
    if (!session?.code) return null
    try {
      const [next, messages] = await Promise.all([
        fetchRoom(session.code),
        fetchRoomMessages({
          code: session.code,
          memberId: session.memberId,
          token: session.token,
        }).catch(() => []),
      ])
      setRoom({ ...next, messages })
      const me = next.members?.find((member) => member.id === session.memberId)
      if (me) {
        setSession((current) =>
          current.isHost === Boolean(me.isHost) &&
          current.nickname === me.nickname
            ? current
            : {
                ...current,
                isHost: Boolean(me.isHost),
                nickname: me.nickname,
              },
        )
      }
      setError(null)
      return next
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [session?.code, session?.memberId, session?.token])

  useEffect(() => {
    if (!session?.code || sessionValidated) return undefined
    let active = true
    resumeRoom(session)
      .then((next) => {
        if (!active) return
        setSession(next)
        setSessionValidated(true)
      })
      .catch((err) => {
        if (!active) return
        clearRoomSession()
        setSession(null)
        setRoom(null)
        setError(err.message)
        setSessionValidated(true)
      })
    return () => {
      active = false
    }
  }, [session, sessionValidated])

  useEffect(() => {
    if (!session?.code || !sessionValidated) return undefined
    refresh()
    const subscription = backend.roomRealtime.subscribe(session.code, refresh)
    channelRef.current = subscription
    subscription.notify('member_connected').catch(() => {})
    const timer = setInterval(refresh, 15000)
    return () => {
      clearInterval(timer)
      channelRef.current = null
      subscription.close()
    }
  }, [session?.code, sessionValidated, refresh])

  function notifyRoomChanged(type) {
    const channel = channelRef.current
    if (!channel) return
    channel.notify(type).catch(() => {})
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
      setSessionValidated(true)
      setRoom(await fetchRoom(next.code))
      await refreshRecentRooms()
      return next
    })

  const join = (code, nickname) =>
    run(async () => {
      const next = await joinRoom(code, nickname)
      setSession(next)
      setSessionValidated(true)
      setRoom(await fetchRoom(next.code))
      notifyRoomChanged('member_joined')
      await refreshRecentRooms()
      return next
    })

  const resume = (savedSession) =>
    run(async () => {
      const next = await resumeRoom(savedSession)
      setSession(next)
      setSessionValidated(true)
      setRoom(await fetchRoom(next.code))
      await refreshRecentRooms()
      return next
    })

  const forget = async (code) => {
    removeRecentRoomSession(code)
    if (session?.code === code) {
      setSession(null)
      setSessionValidated(true)
      setRoom(null)
    }
    await refreshRecentRooms()
  }

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

  const transferHost = (targetMemberId) =>
    run(async () => {
      await transferRoomHost(session, targetMemberId)
      const next = await refresh()
      setSession((current) => ({ ...current, isHost: false }))
      notifyRoomChanged('host_transferred')
      return next
    })

  const sendMessage = (body) =>
    run(async () => {
      await sendRoomMessage(session, body)
      const next = await refresh()
      notifyRoomChanged('chat_message')
      return next
    })

  function leave() {
    clearRoomSession()
    setSession(null)
    setSessionValidated(true)
    setRoom(null)
    setError(null)
  }

  return {
    session,
    room,
    loading,
    error,
    recentRooms,
    recentLoading,
    create,
    join,
    resume,
    forget,
    vote,
    setReady,
    close,
    startSpin,
    nudge,
    rename,
    complete,
    addCandidates,
    removeCandidate,
    transferHost,
    sendMessage,
    leave,
    refresh,
  }
}
