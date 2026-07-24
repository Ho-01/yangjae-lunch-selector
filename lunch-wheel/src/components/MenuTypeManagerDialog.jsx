import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_WEATHER_WEIGHT_CONFIG,
  MENU_TYPE_COLOR_PRESETS,
  MENU_TYPE_ICON_OPTIONS,
  WEATHER_WEIGHT_FIELDS,
} from '../constants/app'
import { TYPE_ICON_MAP, UI_ICONS } from '../constants/icons'
import StateMessage from './StateMessage'

function slugifyCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
}

function normalizeWeights(config) {
  const next = { ...DEFAULT_WEATHER_WEIGHT_CONFIG }
  WEATHER_WEIGHT_FIELDS.forEach(({ key }) => {
    const n = Number(config?.[key])
    next[key] = Number.isFinite(n) ? n : 1
  })
  return next
}

function emptyDraft() {
  return {
    name: '',
    code: '',
    icon_key: 'utensils',
    color: MENU_TYPE_COLOR_PRESETS[5],
    weather_weight_config: { ...DEFAULT_WEATHER_WEIGHT_CONFIG },
  }
}

export default function MenuTypeManagerDialog({
  open,
  onClose,
  menuTypes,
  saving,
  onAdd,
  onSave,
  onDelete,
  onToast,
}) {
  const dialogRef = useRef(null)
  const CloseIcon = UI_ICONS.close
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (isCreating) return
    const current =
      menuTypes.find((type) => type.id === selectedId) || menuTypes[0] || null
    if (!current) {
      setSelectedId(null)
      setDraft(emptyDraft())
      return
    }
    setSelectedId(current.id)
    setDraft({
      name: current.name,
      code: current.code,
      icon_key: current.icon_key,
      color: current.color,
      weather_weight_config: normalizeWeights(current.weather_weight_config),
    })
  }, [open, menuTypes, selectedId, isCreating])

  const PreviewIcon = useMemo(
    () => TYPE_ICON_MAP[draft.icon_key] || TYPE_ICON_MAP.utensils,
    [draft.icon_key],
  )

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  function startCreate() {
    setIsCreating(true)
    setSelectedId(null)
    setDraft(emptyDraft())
  }

  function selectType(type) {
    setIsCreating(false)
    setSelectedId(type.id)
    setDraft({
      name: type.name,
      code: type.code,
      icon_key: type.icon_key,
      color: type.color,
      weather_weight_config: normalizeWeights(type.weather_weight_config),
    })
  }

  function patchWeight(key, value) {
    setDraft((prev) => ({
      ...prev,
      weather_weight_config: {
        ...prev.weather_weight_config,
        [key]: value,
      },
    }))
  }

  async function handleSave() {
    const name = draft.name.trim()
    const code = slugifyCode(draft.code || draft.name)
    if (!name) {
      onToast?.('타입 이름을 입력해주세요.')
      return
    }
    if (!code) {
      onToast?.('타입 코드는 영문/숫자/밑줄만 사용할 수 있습니다.')
      return
    }

    const payload = {
      name,
      code,
      iconKey: draft.icon_key,
      color: draft.color || '#737373',
      weatherWeightConfig: normalizeWeights(draft.weather_weight_config),
    }

    if (isCreating) {
      await onAdd(payload)
      setIsCreating(false)
    } else if (selectedId) {
      await onSave({ id: selectedId, ...payload })
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="type-dialog"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="modal-head">
        <div>
          <h2>메뉴 타입 관리</h2>
        </div>
        <Button
          type="button"
          className="close-x"
          aria-label="닫기"
          onClick={onClose}
        >
          <CloseIcon className="ui-icon" aria-hidden />
        </Button>
      </div>

      <div className="modal-body type-modal-body">
        <aside className="type-list-panel">
          <Button
            type="button"
            className="btn primary type-add-btn"
            disabled={saving}
            onClick={startCreate}
          >
            타입 추가
          </Button>
          <div className="type-list">
            {menuTypes.map((type) => {
              const Icon = TYPE_ICON_MAP[type.icon_key] || TYPE_ICON_MAP.utensils
              const active = !isCreating && type.id === selectedId
              return (
                <Button
                  key={type.id}
                  type="button"
                  className={`type-list-item${active ? ' is-active' : ''}`}
                  onClick={() => selectType(type)}
                >
                  <span
                    className="type-list-icon"
                    style={{ color: type.color, borderColor: type.color }}
                  >
                    <Icon className="ui-icon" aria-hidden />
                  </span>
                  <span>{type.name}</span>
                </Button>
              )
            })}
          </div>
        </aside>

        <div className="type-edit-panel">
          {!menuTypes.length && !isCreating ? (
            <StateMessage compact title="메뉴 타입이 없습니다" description="새 타입 추가 버튼으로 첫 타입을 만들어주세요." />
          ) : (
            <>
              <div className="type-basic-grid">
                <label htmlFor="type-name">
                  이름
                  <Input
                    id="type-name"
                    type="text"
                    maxLength={40}
                    value={draft.name}
                    onChange={(event) => {
                      const name = event.target.value
                      setDraft((prev) => ({
                        ...prev,
                        name,
                        code: isCreating
                          ? slugifyCode(name) || prev.code
                          : prev.code,
                      }))
                    }}
                  />
                </label>
                <label htmlFor="type-code">
                  코드
                  <Input
                    id="type-code"
                    type="text"
                    maxLength={40}
                    value={draft.code}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        code: slugifyCode(event.target.value),
                      }))
                    }
                  />
                </label>
                <label htmlFor="type-icon">
                  아이콘
                  <NativeSelect
                    id="type-icon"
                    value={draft.icon_key}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        icon_key: event.target.value,
                      }))
                    }
                  >
                    {MENU_TYPE_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label htmlFor="type-color">
                  색상
                  <div className="type-color-row">
                    <Input
                      id="type-color"
                      type="color"
                      value={draft.color || '#737373'}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          color: event.target.value,
                        }))
                      }
                    />
                    <div className="type-color-presets">
                      {MENU_TYPE_COLOR_PRESETS.map((hex) => (
                        <Button
                          key={hex}
                          type="button"
                          className="type-color-swatch"
                          style={{ background: hex }}
                          aria-label={`색상 ${hex}`}
                          onClick={() =>
                            setDraft((prev) => ({ ...prev, color: hex }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </label>
              </div>

              <div className="type-preview">
                <span
                  className="type-list-icon"
                  style={{ color: draft.color, borderColor: draft.color }}
                >
                  <PreviewIcon className="ui-icon" aria-hidden />
                </span>
                <span>{draft.name || '미리보기'}</span>
              </div>

              <h3 className="type-weight-title">날씨 가중치</h3>
              <p className="desc type-weight-desc">
                최종값 = 기본 × 온도 범주(1개) × 비/눈/습함/강풍(해당 시). 결과는
                0.18~4.2로 제한됩니다.
              </p>
              <div className="weight-grid">
                {WEATHER_WEIGHT_FIELDS.map((field) => (
                  <label key={field.key} htmlFor={`weight-${field.key}`}>
                    <span className="weight-label">{field.label}</span>
                    <span className="weight-hint">{field.hint}</span>
                    <Input
                      id={`weight-${field.key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={draft.weather_weight_config[field.key]}
                      onChange={(event) =>
                        patchWeight(field.key, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="type-edit-actions">
                <Button
                  type="button"
                  className="btn primary"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {isCreating ? '추가' : '저장'}
                </Button>
                {!isCreating && selectedId ? (
                  <Button
                    type="button"
                    className="icon-btn delete"
                    disabled={saving}
                    onClick={() => {
                      if (
                        window.confirm(
                          `'${menuTypes.find((type) => type.id === selectedId)?.name || draft.name}' 메뉴 타입을 삭제할까요?`,
                        )
                      ) {
                        onDelete(selectedId)
                      }
                    }}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
