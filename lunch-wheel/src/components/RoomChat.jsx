import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useRef, useState } from 'react'

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
  const listRef = useRef(null)

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
    <section className="room-chat" aria-labelledby="room-chat-title">
      <div className="room-chat-head">
        <div>
          <h3 id="room-chat-title">방 채팅</h3>
          <p>후보 추가와 별개인 대화 공간입니다.</p>
        </div>
        <small>최대 300자</small>
      </div>
      <div className="room-chat-messages" ref={listRef} aria-live="polite">
        {!messages.length ? (
          <div className="room-chat-empty">아직 메시지가 없어요. 먼저 인사해보세요.</div>
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
          placeholder="메시지를 입력하세요"
          onChange={(event) => setBody(event.target.value)}
        />
        <Button
          type="submit"
          className="btn primary"
          disabled={disabled || !body.trim()}
        >
          보내기
        </Button>
      </form>
    </section>
  )
}
