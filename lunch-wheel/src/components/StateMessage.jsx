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
      {actionLabel && onAction ? (
        <button type="button" className="btn ghost" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

