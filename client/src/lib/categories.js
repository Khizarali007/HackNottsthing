// Colour per aiCategory. `color` is used for swatches and the minimap,
// `filter` recolours the XP title bar so it keeps its gloss.
export const CATEGORIES = [
  { key: 'feature', label: 'Feature', color: '#2c9a2c', filter: 'hue-rotate(-100deg)' },
  { key: 'bugfix', label: 'Bugfix', color: '#d42a1a', filter: 'hue-rotate(140deg) saturate(1.2)' },
  { key: 'refactor', label: 'Refactor', color: '#8a2be2', filter: 'hue-rotate(50deg)' },
  { key: 'chore', label: 'Chore', color: '#7a7a7a', filter: 'grayscale(1) brightness(1.1)' },
]

// aiCategory is null until the classifier has run: classic XP blue.
export const UNCLASSIFIED = { key: null, label: 'Unclassified', color: '#0053ee', filter: 'none' }

export function categoryStyle(aiCategory) {
  const key = aiCategory?.toLowerCase()
  return CATEGORIES.find((c) => c.key === key) ?? UNCLASSIFIED
}
