import {
  GOOGLE_TYPE_TO_PLACE_CATEGORY,
  PLACE_CATEGORY_DEFINITIONS,
} from '../constants/placeCategories.js'

const CATEGORY_BY_ID = new Map(
  PLACE_CATEGORY_DEFINITIONS.map((category) => [category.id, category]),
)

export function classifyGooglePlace({ primaryType, types = [] } = {}) {
  const candidates = [
    primaryType,
    ...types.filter((type) => type !== primaryType),
  ].filter(Boolean)

  const matchedType =
    candidates.find(
      (type) =>
        GOOGLE_TYPE_TO_PLACE_CATEGORY[type] &&
        GOOGLE_TYPE_TO_PLACE_CATEGORY[type] !== 'other',
    ) ||
    candidates.find((type) => GOOGLE_TYPE_TO_PLACE_CATEGORY[type])
  const categoryId = matchedType
    ? GOOGLE_TYPE_TO_PLACE_CATEGORY[matchedType]
    : 'other'

  return {
    ...CATEGORY_BY_ID.get(categoryId),
    matchedType: matchedType || null,
  }
}
