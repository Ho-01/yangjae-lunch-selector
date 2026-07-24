import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useRef, useState } from 'react'

export default function LunchRoomDialog({
  open,
  defaultCode,
  onClose,
  loading,
  onCreate,
  onJoin,
}) {
  const dialogRef = useRef(null)
  const [mode, setMode] = useState('create')
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    if (!defaultCode) return
    setMode('join')
    setCode(defaultCode.toUpperCase())
  }, [defaultCode])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function submit(event) {
    event.preventDefault()
    if (mode === 'create') await onCreate(nickname.trim())
    else await onJoin(code.trim().toUpperCase(), nickname.trim())
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="room-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="modal-head">
        <h2>같이 고를 점심방</h2>
        <Button type="button" className="close-x" onClick={onClose} aria-label="닫기">
          ×
        </Button>
      </div>
      <form className="room-entry" onSubmit={submit}>
        <div className="room-entry-tabs">
          <Button
            type="button"
            className={mode === 'create' ? 'is-active' : ''}
            onClick={() => setMode('create')}
          >
            방 만들기
          </Button>
          <Button
            type="button"
            className={mode === 'join' ? 'is-active' : ''}
            onClick={() => setMode('join')}
          >
            코드로 참여
          </Button>
        </div>
        {mode === 'join' ? (
          <label>
            <span>방 코드</span>
            <Input
              value={code}
              maxLength={6}
              autoCapitalize="characters"
              placeholder="예: A1B2C3"
              onChange={(event) =>
                setCode(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())
              }
              required
            />
          </label>
        ) : (
          <p className="room-entry-help">
            방 코드를 동료에게 공유하고 함께 메뉴를 골라보세요.
          </p>
        )}
        <label>
          <span>닉네임</span>
          <Input
            value={nickname}
            maxLength={20}
            placeholder="비워두면 자동으로 만들어드려요"
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>
        <Button type="submit" className="btn primary room-submit" disabled={loading}>
          {loading ? '잠시만요…' : mode === 'create' ? '점심방 만들기' : '참여하기'}
        </Button>
      </form>
    </dialog>
  )
}
