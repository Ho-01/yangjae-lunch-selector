import { Button } from '@/components/ui/button'
export default function StateMessage({
  type = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) {
  const role = type === 'error' ? 'alert' : 'status'
  return (
    <div className={`state-message is-${type}${compact ? ' is-compact' : ''}`} role={role}>
      {title ? <strong>{title}</strong> : null}
      {description ? <p>{description}</p> : null}
      {type === 'loading' ? (
        <div
          className="state-progress"
          role="progressbar"
          aria-label="점심 메뉴 불러오는 중"
        >
          <span />
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <Button type="button" className="btn ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
