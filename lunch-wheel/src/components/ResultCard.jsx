import { Button } from '@/components/ui/button'
import PlaceMeta from './PlaceMeta'
import { getResultIcon } from '../constants/icons'
import CelebrationBurst from './CelebrationBurst'

export default function ResultCard({
  visible,
  menuName,
  message,
  messageIconKey,
  reason,
  placeLinks,
  onShare,
}) {
  const MessageIcon = getResultIcon(messageIconKey)

  return (
    <div className={`result${visible ? ' show' : ''}`} aria-live="polite">
      <CelebrationBurst active={visible} burstKey={menuName || 'result'} />
      <div className="small">선택 결과</div>
      <div className="menu">{menuName || '—'}</div>
      {message ? (
        <div className="result-message">
          <MessageIcon className="ui-icon" aria-hidden />
          <span>{message}</span>
        </div>
      ) : null}
      <div className="why">{reason}</div>
      {visible && onShare ? (
        <Button type="button" className="btn ghost result-share" onClick={onShare}>
          결과 공유하기
        </Button>
      ) : null}
      {placeLinks?.length ? (
        <div className="result-place">
          <PlaceMeta placeLinks={placeLinks} showPhotos />
        </div>
      ) : null}
    </div>
  )
}
