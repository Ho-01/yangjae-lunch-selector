import TypeChip from './TypeChip'
import PlaceMeta from './PlaceMeta'

export default function MenuExclusionList({
  menus,
  excludedIds,
  disabled,
  onToggle,
  onBanAll,
  onClearAll,
}) {
  return (
    <section className="card side-card">
      <h2>오늘 제외할 메뉴</h2>
      <p className="desc">
        체크한 메뉴는 이번 돌림에서 완전히 빠집니다. 제외 상태는 팀에 공유됩니다.
      </p>
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
          <div className="empty-hint">등록된 메뉴가 없습니다.</div>
        ) : (
          menus.map((menu) => {
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
