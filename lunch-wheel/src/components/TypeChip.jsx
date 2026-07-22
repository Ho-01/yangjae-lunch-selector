import { getTypeIcon } from '../constants/icons'

export default function TypeChip({ menuType }) {
  if (!menuType) return null
  const Icon = getTypeIcon(menuType.icon_key)
  const codeClass = `type-${menuType.code === 'hot_soup' ? 'hotSoup' : menuType.code}`

  return (
    <span className={`type-chip ${codeClass}`}>
      <Icon className="ui-icon" aria-hidden />
      <span>{menuType.name}</span>
    </span>
  )
}
