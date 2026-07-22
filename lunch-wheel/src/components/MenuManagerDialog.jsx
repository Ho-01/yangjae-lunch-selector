import { useEffect, useRef, useState } from 'react'
import { UI_ICONS } from '../constants/icons'
import PlaceLinkEditor from './PlaceLinkEditor'

export default function MenuManagerDialog({
  open,
  onClose,
  menus,
  menuTypes,
  team,
  saving,
  onAdd,
  onSave,
  onDelete,
  onConnectPlace,
  onDisconnectPlace,
  onToast,
}) {
  const dialogRef = useRef(null)
  const [newName, setNewName] = useState('')
  const [newTypeId, setNewTypeId] = useState('')
  const [drafts, setDrafts] = useState({})
  const CloseIcon = UI_ICONS.close

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const next = {}
    menus.forEach((menu) => {
      next[menu.id] = {
        name: menu.name,
        menuTypeId: menu.menu_type?.id || menu.menu_type_id,
      }
    })
    setDrafts(next)
    setNewTypeId((prev) => prev || menuTypes[0]?.id || '')
  }, [open, menus, menuTypes])

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    await onAdd({ name, menuTypeId: newTypeId || menuTypes[0]?.id })
    setNewName('')
  }

  return (
    <dialog
      ref={dialogRef}
      id="manageDialog"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="modal-head">
        <div>
          <h2>메뉴 관리</h2>
        </div>
        <button
          type="button"
          className="close-x"
          aria-label="닫기"
          onClick={onClose}
        >
          <CloseIcon className="ui-icon" aria-hidden />
        </button>
      </div>
      <div className="modal-body">
        <div className="add-row">
          <label className="sr-only" htmlFor="newMenuName">
            추가할 메뉴 이름
          </label>
          <input
            id="newMenuName"
            type="text"
            maxLength={40}
            placeholder="추가할 메뉴 이름"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAdd()
              }
            }}
          />
          <label className="sr-only" htmlFor="newMenuType">
            메뉴 타입
          </label>
          <select
            id="newMenuType"
            value={newTypeId}
            onChange={(event) => setNewTypeId(event.target.value)}
          >
            {menuTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn primary"
            disabled={saving || !menuTypes.length}
            onClick={handleAdd}
          >
            메뉴 추가
          </button>
        </div>

        <div className="menu-table">
          {!menus.length ? (
            <div className="empty-hint">메뉴가 없습니다. 위에서 추가해주세요.</div>
          ) : (
            menus.map((menu) => {
              const draft = drafts[menu.id] || {
                name: menu.name,
                menuTypeId: menu.menu_type?.id,
              }
              return (
                <div className="edit-block" key={menu.id}>
                  <div className="edit-row">
                    <label className="sr-only" htmlFor={`menu-name-${menu.id}`}>
                      메뉴 이름
                    </label>
                    <input
                      id={`menu-name-${menu.id}`}
                      type="text"
                      maxLength={40}
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [menu.id]: { ...draft, name: event.target.value },
                        }))
                      }
                    />
                    <label className="sr-only" htmlFor={`menu-type-${menu.id}`}>
                      메뉴 성격
                    </label>
                    <select
                      id={`menu-type-${menu.id}`}
                      value={draft.menuTypeId}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [menu.id]: {
                            ...draft,
                            menuTypeId: event.target.value,
                          },
                        }))
                      }
                    >
                      {menuTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="icon-btn save"
                      disabled={saving}
                      onClick={() =>
                        onSave({
                          id: menu.id,
                          name: draft.name.trim(),
                          menuTypeId: draft.menuTypeId,
                        })
                      }
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      className="icon-btn delete"
                      disabled={saving}
                      onClick={() => onDelete(menu.id)}
                    >
                      삭제
                    </button>
                  </div>
                  <PlaceLinkEditor
                    menu={menu}
                    team={team}
                    saving={saving}
                    onConnect={onConnectPlace}
                    onDisconnect={onDisconnectPlace}
                    onToast={onToast}
                  />
                </div>
              )
            })
          )}
        </div>
        <p className="modal-foot-note">
          메뉴 성격은 날씨 가중치에 사용됩니다. Google 장소를 연결하면 별점과
          사진을 함께 볼 수 있습니다.
        </p>
      </div>
    </dialog>
  )
}
