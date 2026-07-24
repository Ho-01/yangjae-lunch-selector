import { useCallback, useRef, useState } from 'react'
import { backend } from '../backend'

const {
  addExclusion,
  clearExclusions,
  excludeAllMenus,
  removeExclusion,
} = backend.exclusions
import { getKoreaDateString } from '../utils/koreaDate'

export function useDailyExclusions({
  teamId,
  menus,
  excludedIds,
  setExcludedIds,
}) {
  const [saving, setSaving] = useState(false)
  const busyRef = useRef(false)

  const withBusy = useCallback(async (fn) => {
    if (busyRef.current) return
    busyRef.current = true
    setSaving(true)
    try {
      await fn()
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }, [])

  const toggleExclusion = useCallback(
    async (menuId, shouldExclude) => {
      if (!teamId || busyRef.current) return

      const previous = new Set(excludedIds)
      const next = new Set(excludedIds)
      if (shouldExclude) next.add(menuId)
      else next.delete(menuId)
      setExcludedIds(next)

      const date = getKoreaDateString()

      try {
        await withBusy(async () => {
          if (shouldExclude) {
            await addExclusion({ teamId, menuId, exclusionDate: date })
          } else {
            await removeExclusion({ teamId, menuId, exclusionDate: date })
          }
        })
      } catch (err) {
        setExcludedIds(previous)
        throw err
      }
    },
    [teamId, excludedIds, setExcludedIds, withBusy],
  )

  const banAll = useCallback(async () => {
    if (!teamId || busyRef.current) return
    const previous = new Set(excludedIds)
    const ids = menus.map((menu) => menu.id)
    setExcludedIds(new Set(ids))

    try {
      await withBusy(async () => {
        await excludeAllMenus({
          teamId,
          menuIds: ids,
          exclusionDate: getKoreaDateString(),
        })
      })
    } catch (err) {
      setExcludedIds(previous)
      throw err
    }
  }, [teamId, menus, excludedIds, setExcludedIds, withBusy])

  const clearAll = useCallback(async () => {
    if (!teamId || busyRef.current) return
    const previous = new Set(excludedIds)
    setExcludedIds(new Set())

    try {
      await withBusy(async () => {
        await clearExclusions({
          teamId,
          exclusionDate: getKoreaDateString(),
        })
      })
    } catch (err) {
      setExcludedIds(previous)
      throw err
    }
  }, [teamId, excludedIds, setExcludedIds, withBusy])

  return {
    saving,
    toggleExclusion,
    banAll,
    clearAll,
  }
}
