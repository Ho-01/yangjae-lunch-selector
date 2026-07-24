import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export default function CollapsibleSidePanel({
  title,
  summary,
  children,
  defaultMobileOpen = false,
}) {
  const [mobile, setMobile] = useState(() =>
    window.matchMedia('(max-width: 640px)').matches,
  )
  const [open, setOpen] = useState(() => !mobile || defaultMobileOpen)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const handleChange = (event) => {
      setMobile(event.matches)
      if (!event.matches) setOpen(true)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className={`side-collapse${open ? ' is-open' : ''}`}>
      {mobile ? (
        <Button
          type="button"
          className="side-collapse-toggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span>
            <strong>{title}</strong>
            {summary ? <small>{summary}</small> : null}
          </span>
          <span aria-hidden>{open ? '접기' : '펼치기'}</span>
        </Button>
      ) : null}
      <div className="side-collapse-content" hidden={mobile && !open}>
        {children}
      </div>
    </div>
  )
}
