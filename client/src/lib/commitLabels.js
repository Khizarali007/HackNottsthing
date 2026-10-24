// Labels the zero-shot model chooses between, and the contract category each one maps to.
const LABEL_TO_CATEGORY = {
  'bug fix': 'Bugfix',
  'new feature': 'Feature',
  'code refactoring': 'Refactor',
  chore: 'Chore',
}

export const CANDIDATE_LABELS = Object.keys(LABEL_TO_CATEGORY)

// Returns "Bugfix" | "Feature" | "Refactor" | "Chore", or null for anything else.
export function toCategory(label) {
  return Object.hasOwn(LABEL_TO_CATEGORY, label) ? LABEL_TO_CATEGORY[label] : null
}
