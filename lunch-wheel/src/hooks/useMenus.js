import { useCallback, useEffect, useState } from 'react'
import { backend } from '../backend'

const { fetchActiveTeamBySlug } = backend.teams
const {
  countActiveMenusForType,
  createMenuType,
  deactivateMenuType,
  fetchActiveMenuTypes,
  updateMenuType,
} = backend.menuTypes
const {
  createMenu,
  deactivateMenu,
  fetchActiveMenus,
  updateMenu,
} = backend.menus
const { fetchExclusions } = backend.exclusions
const {
  deactivateGoogleLinksForMenu,
  deactivatePlaceLink,
  fetchPlaceLinks,
  upsertGooglePlaceLink,
} = backend.placeLinks
const {
  cachePlacePhotosForLink,
  refreshStalePlaceLinks,
} = backend.placePhotos
import { getKoreaDateString } from '../utils/koreaDate'
import { TEAM_SLUG } from '../constants/app'

function attachLinks(menus, links) {
  const byMenu = new Map()
  links.forEach((link) => {
    const list = byMenu.get(link.menu_id) || []
    list.push(link)
    byMenu.set(link.menu_id, list)
  })
  return menus.map((menu) => ({
    ...menu,
    place_links: byMenu.get(menu.id) || [],
  }))
}

function replaceLinkInMenus(menus, nextLink) {
  return menus.map((menu) => {
    if (menu.id !== nextLink.menu_id) return menu
    const others = (menu.place_links || []).filter((item) => item.id !== nextLink.id)
    return { ...menu, place_links: [...others, nextLink] }
  })
}

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
      if (!backend.isConfigured()) {
        throw new Error('메뉴를 불러올 준비가 되지 않았습니다. 잠시 후 다시 시도해주세요.')
      }

      const activeTeam = await fetchActiveTeamBySlug(TEAM_SLUG)
      const [types, activeMenus, exclusions, links] = await Promise.all([
        fetchActiveMenuTypes(activeTeam.id),
        fetchActiveMenus(activeTeam.id),
        fetchExclusions(activeTeam.id, getKoreaDateString()),
        fetchPlaceLinks(activeTeam.id),
      ])

      setTeam(activeTeam)
      setMenuTypes(types)
      setMenus(attachLinks(activeMenus, links))
      setExcludedIds(new Set(exclusions.map((row) => row.menu_id)))

      // Background: cache missing photos / refresh weekly (does not block UI)
      refreshStalePlaceLinks(links, {
        onUpdated: (nextLink) => {
          setMenus((prev) => replaceLinkInMenus(prev, nextLink))
        },
      }).catch((err) => console.error(err))
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
        setMenus((prev) => [...prev, { ...created, place_links: [] }])
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
      setMenus((prev) =>
        prev.map((menu) =>
          menu.id === id
            ? { ...updated, place_links: menu.place_links || [] }
            : menu,
        ),
      )
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

  const connectGooglePlace = useCallback(
    async ({ menuId, place }) => {
      if (!team) throw new Error('팀 정보가 없습니다.')
      setSaving(true)
      try {
        let link = await upsertGooglePlaceLink({
          teamId: team.id,
          menuId,
          place,
        })

        setMenus((prev) =>
          prev.map((menu) => {
            if (menu.id !== menuId) return menu
            const others = (menu.place_links || []).filter(
              (item) => !(item.provider === 'google' && item.is_active),
            )
            return { ...menu, place_links: [...others, link] }
          }),
        )

        // Cache photos to Storage (Google Photo billed once here)
        link = await cachePlacePhotosForLink(link, place.photoRefs || [])
        setMenus((prev) => replaceLinkInMenus(prev, link))
        return link
      } finally {
        setSaving(false)
      }
    },
    [team],
  )

  const disconnectGooglePlace = useCallback(async (menuId) => {
    setSaving(true)
    try {
      const menu = menus.find((item) => item.id === menuId)
      const googleLinks = (menu?.place_links || []).filter(
        (link) => link.provider === 'google',
      )
      if (googleLinks.length) {
        await Promise.all(googleLinks.map((link) => deactivatePlaceLink(link.id)))
      } else {
        await deactivateGoogleLinksForMenu(menuId)
      }
      setMenus((prev) =>
        prev.map((item) =>
          item.id === menuId
            ? {
                ...item,
                place_links: (item.place_links || []).filter(
                  (link) => link.provider !== 'google',
                ),
              }
            : item,
        ),
      )
    } finally {
      setSaving(false)
    }
  }, [menus])

  const addMenuType = useCallback(
    async ({ name, code, iconKey, color, weatherWeightConfig }) => {
      if (!team) throw new Error('팀 정보가 없습니다.')
      setSaving(true)
      try {
        const sortOrder =
          menuTypes.reduce((max, type) => Math.max(max, type.sort_order ?? 0), 0) +
          1
        const created = await createMenuType({
          teamId: team.id,
          name,
          code,
          iconKey,
          color,
          weatherWeightConfig,
          sortOrder,
        })
        setMenuTypes((prev) => [...prev, created])
        return created
      } finally {
        setSaving(false)
      }
    },
    [team, menuTypes],
  )

  const saveMenuType = useCallback(async (payload) => {
    setSaving(true)
    try {
      const updated = await updateMenuType(payload)
      setMenuTypes((prev) =>
        prev.map((type) => (type.id === updated.id ? updated : type)),
      )
      setMenus((prev) =>
        prev.map((menu) =>
          menu.menu_type?.id === updated.id || menu.menu_type_id === updated.id
            ? {
                ...menu,
                menu_type: {
                  id: updated.id,
                  code: updated.code,
                  name: updated.name,
                  icon_key: updated.icon_key,
                  color: updated.color,
                  weather_weight_config: updated.weather_weight_config,
                },
                weather_profile: {
                  id: updated.id,
                  code: updated.code,
                  name: updated.name,
                  icon_key: updated.icon_key,
                  color: updated.color,
                  weight_config: updated.weather_weight_config,
                  source: 'manual',
                },
              }
            : menu,
        ),
      )
      return updated
    } finally {
      setSaving(false)
    }
  }, [])

  const removeMenuType = useCallback(async (id) => {
    setSaving(true)
    try {
      const used = await countActiveMenusForType(id)
      if (used > 0) {
        throw new Error(
          `이 성향을 쓰는 메뉴가 ${used}개 있습니다. 메뉴의 날씨 성향을 바꾼 뒤 삭제해주세요.`,
        )
      }
      await deactivateMenuType(id)
      setMenuTypes((prev) => prev.filter((type) => type.id !== id))
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
    connectGooglePlace,
    disconnectGooglePlace,
    addMenuType,
    saveMenuType,
    removeMenuType,
  }
}
