import { useCallback, useEffect, useState } from 'react'
import { fetchActiveTeamBySlug } from '../services/teamService'
import { fetchActiveMenuTypes } from '../services/menuTypeService'
import {
  createMenu,
  deactivateMenu,
  fetchActiveMenus,
  updateMenu,
} from '../services/menuService'
import { fetchExclusions } from '../services/exclusionService'
import { getKoreaDateString } from '../utils/koreaDate'
import { TEAM_SLUG } from '../constants/app'
import { isSupabaseConfigured } from '../lib/supabase'

export function useMenus() {
  const [team, setTeam] = useState(null)
  const [menuTypes, setMenuTypes] = useState([])
  const [menus, setMenus] = useState([])
  const [excludedIds, setExcludedIds] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
      }

      const activeTeam = await fetchActiveTeamBySlug(TEAM_SLUG)
      const [types, activeMenus, exclusions] = await Promise.all([
        fetchActiveMenuTypes(activeTeam.id),
        fetchActiveMenus(activeTeam.id),
        fetchExclusions(activeTeam.id, getKoreaDateString()),
      ])

      setTeam(activeTeam)
      setMenuTypes(types)
      setMenus(activeMenus)
      setExcludedIds(new Set(exclusions.map((row) => row.menu_id)))
    } catch (err) {
      console.error(err)
      setError(err?.message || '데이터를 불러오지 못했습니다.')
      setTeam(null)
      setMenuTypes([])
      setMenus([])
      setExcludedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const addMenu = useCallback(
    async ({ name, menuTypeId }) => {
      if (!team) throw new Error('팀 정보가 없습니다.')
      setSaving(true)
      try {
        const sortOrder =
          menus.reduce((max, menu) => Math.max(max, menu.sort_order ?? 0), 0) + 1
        const created = await createMenu({
          teamId: team.id,
          name,
          menuTypeId,
          sortOrder,
        })
        setMenus((prev) => [...prev, created])
        return created
      } finally {
        setSaving(false)
      }
    },
    [team, menus],
  )

  const saveMenu = useCallback(async ({ id, name, menuTypeId }) => {
    setSaving(true)
    try {
      const updated = await updateMenu({ id, name, menuTypeId })
      setMenus((prev) => prev.map((menu) => (menu.id === id ? updated : menu)))
      return updated
    } finally {
      setSaving(false)
    }
  }, [])

  const removeMenu = useCallback(async (id) => {
    setSaving(true)
    try {
      await deactivateMenu(id)
      setMenus((prev) => prev.filter((menu) => menu.id !== id))
      setExcludedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    team,
    menuTypes,
    menus,
    setMenus,
    excludedIds,
    setExcludedIds,
    loading,
    saving,
    error,
    reload: loadAll,
    addMenu,
    saveMenu,
    removeMenu,
  }
}
