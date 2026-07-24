import { useMemo, useState } from 'react'
import TypeChip from './TypeChip'
import PlaceMeta from './PlaceMeta'
import { UI_ICONS } from '../constants/icons'
import StateMessage from './StateMessage'

export default function MenuExclusionList({
  menus,
  excludedIds,
  disabled,
  onToggle,
  onBanAll,
  onClearAll,
}) {
  const [query, setQuery] = useState('')
  const SearchIcon = UI_ICONS.search
  const filteredMenus = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko')
    if (!normalized) return menus
    return menus.filter((menu) => {
      const typeName = menu.menu_type?.name || ''
      return `${menu.name} ${typeName}`
        .toLocaleLowerCase('ko')
        .includes(normalized)
    })
  }, [menus, query])

  return (
    <section className="card side-card">
      <h2>오늘 제외할 메뉴</h2>
      <p className="desc">
        체크한 메뉴는 이번 돌림에서 완전히 빠집니다. 제외 상태는 팀에 공유됩니다.
      </p>
      <label className="menu-list-search">
        <span className="sr-only">메뉴 목록 검색</span>
        <SearchIcon className="ui-icon" aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="메뉴 또는 종류 검색"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="ban-actions">
        <button
          type="button"
          id="banAllBtn"
          disabled={disabled || !menus.length}
          onClick={onBanAll}
        >
          전부 제외
        </button>
        <button
          type="button"
          id="clearBanBtn"
          disabled={disabled || excludedIds.size === 0}
          onClick={onClearAll}
        >
          제외 해제
        </button>
      </div>
      <div className="ban-list">
        {!menus.length ? (
          <StateMessage compact title="등록된 메뉴가 없습니다" description="메뉴 관리에서 후보를 추가해주세요." />
        ) : !filteredMenus.length ? (
          <StateMessage compact title="검색 결과가 없습니다" description="다른 메뉴명이나 종류로 검색해보세요." />
        ) : (
          filteredMenus.map((menu) => {
            const banned = excludedIds.has(menu.id)
            return (
              <div
                key={menu.id}
                className={`ban-item-block${banned ? ' is-banned' : ''}`}
              >
                <label className="ban-item">
                  <input
                    type="checkbox"
                    checked={banned}
                    disabled={disabled}
                    aria-label={`${menu.name} 오늘 제외`}
                    onChange={(event) => onToggle(menu.id, event.target.checked)}
                  />
                  <span className="ban-name" title={menu.name}>
                    {menu.name}
                  </span>
                  <TypeChip menuType={menu.menu_type} />
                </label>
                <PlaceMeta
                  placeLinks={menu.place_links}
                  compact
                  showPhotos
                />
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
