/**
 * Converts dash-case attribute names into camelCase property names.
 *
 * @param {string} value
 * @returns {string}
 */
export function camelCase (value) {
  return String(value).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Parses a space- or comma-separated numeric vector.
 *
 * @param {string | number[] | { x?: number, y?: number, z?: number }} value
 * @returns {number[]}
 */
export function parseVector (value) {
  if (Array.isArray(value)) {
    return value.map(Number)
  }

  if (value && typeof value === 'object') {
    return [value.x, value.y, value.z].filter((entry) => entry !== undefined).map(Number)
  }

  return String(value)
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
}

/**
 * Parses an HTML attribute into a plain JavaScript value.
 *
 * @param {string} value
 * @returns {boolean | number | number[] | string}
 */
export function parseAttributeValue (value) {
  if (value === '') {
    return true
  }

  const trimmed = String(value).trim()

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  if (/^-?\d+(?:\.\d+)?(?:[\s,]+-?\d+(?:\.\d+)?)+$/.test(trimmed)) {
    return parseVector(trimmed)
  }

  return trimmed
}

/**
 * Returns a stable JSON representation for cache keys and tests.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify (value) {
  return JSON.stringify(sortValue(value))
}

function sortValue (value) {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)])
    )
  }

  return value
}
