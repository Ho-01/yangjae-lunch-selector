import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useRef, useState } from 'react'
import { UI_ICONS } from '../constants/icons'

function formatTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function RoomChat({
  messages = [],
  currentMemberId,
  disabled,
  onSend,
}) {
  const [body, setBody] = useState('')
  const [isOpen, setIsOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 640,
  )
  const listRef = useRef(null)
  const ChevronIcon = isOpen ? UI_ICONS.chevronUp : UI_ICONS.chevronDown

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length])

  async function submit(event) {
    event.preventDefault()
    const text = body.trim()
    if (!text || disabled) return
    await onSend(text)
    setBody('')
  }

  return (
    <section
      className={`room-chat${isOpen ? ' is-open' : ''}`}
      aria-labelledby="room-chat-title"
    >
      <Button
        type="button"
        variant="ghost"
        className="room-chat-toggle"
        aria-expanded={isOpen}
        aria-controls="room-chat-content"
        onClick={() => setIsOpen((open) => !open)}
      >
        <div>
          <h3 id="room-chat-title">방 채팅</h3>
          <p>{messages.length ? `대화 ${messages.length}개` : '아직 대화가 없어요'}</p>
        </div>
        <ChevronIcon className="ui-icon" aria-hidden />
      </Button>
      {isOpen ? (
        <div id="room-chat-content" className="room-chat-content">
          <div className="room-chat-messages" ref={listRef} aria-live="polite">
            {!messages.length ? (
              <div className="room-chat-empty">가볍게 인사부터 건네보세요.</div>
            ) : (
              messages.map((message) => {
                const mine = message.memberId === currentMemberId
                return (
                  <article
                    className={`room-chat-message${mine ? ' is-mine' : ''}`}
                    key={message.id}
                  >
                    <div>
                      <strong>{mine ? '나' : message.nickname}</strong>
                      <time dateTime={message.createdAt}>
                        {formatTime(message.createdAt)}
                      </time>
                    </div>
                    <p>{message.body}</p>
                  </article>
                )
              })
            )}
          </div>
          <form className="room-chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="room-chat-input">
              채팅 메시지
            </label>
            <Input
              id="room-chat-input"
              value={body}
              maxLength={300}
              disabled={disabled}
              placeholder="메시지 입력"
              onChange={(event) => setBody(event.target.value)}
            />
            <Button type="submit" disabled={disabled || !body.trim()}>
              보내기
            </Button>
          </form>
        </div>
      ) : null}
    </section>
  )
}
