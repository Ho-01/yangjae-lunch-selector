import { useCallback, useEffect, useState } from 'react'
import {
  clearRoomSession,
  closeVoting,
  completeRoom,
  createRoom,
  fetchRoom,
  joinRoom,
  loadRoomSession,
  saveVotes,
} from '../services/lunchRoomService'

export function useLunchRoom(teamId) {
  const [session, setSession] = useState(loadRoomSession)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    const timer = setInterval(refresh, 3000)
    return () => clearInterval(timer)
  }, [session?.code, refresh])

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

  const create = (nickname) =>
    run(async () => {
      const next = await createRoom(teamId, nickname)
      setSession(next)
      setRoom(await fetchRoom(next.code))
      return next
    })

  const join = (code, nickname) =>
    run(async () => {
      const next = await joinRoom(code, nickname)
      setSession(next)
      setRoom(await fetchRoom(next.code))
      return next
    })

  const vote = (likes, veto) =>
    run(async () => {
      await saveVotes(session, likes, veto)
      return refresh()
    })

  const close = () =>
    run(async () => {
      await closeVoting(session)
      return refresh()
    })

  const complete = (menuId) =>
    run(async () => {
      await completeRoom(session, menuId)
      return refresh()
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
    close,
    complete,
    leave,
    refresh,
  }
}
