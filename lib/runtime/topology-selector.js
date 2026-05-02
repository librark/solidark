export function parseTopologySelector (selection, count) {
  const indexes = new Set()

  for (const token of topologySelectorTokens(selection)) {
    addTopologySelectorToken(indexes, token, count)
  }

  return indexes
}

function topologySelectorTokens (selection) {
  if (Array.isArray(selection)) {
    return selection.flatMap(topologySelectorTokens)
  }

  if (typeof selection === 'number') {
    return [String(selection)]
  }

  return String(selection)
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
}

function addTopologySelectorToken (indexes, token, count) {
  const normalized = String(token).trim().toLowerCase()

  if (normalized === 'first') {
    addTopologyIndex(indexes, 0, count)
    return
  }

  if (normalized === 'last') {
    addTopologyIndex(indexes, count - 1, count)
    return
  }

  const range = topologyRange(normalized)

  if (range) {
    addTopologyRange(indexes, range[0], range[1], count)
    return
  }

  addTopologyIndex(indexes, Number(normalized), count)
}

function topologyRange (token) {
  const match = token.match(/^(-?\d+)\s*(?:\.\.|-)\s*(-?\d+)$/)

  if (!match) {
    return null
  }

  return [Number(match[1]), Number(match[2])]
}

function addTopologyRange (indexes, start, end, count) {
  const normalizedStart = normalizeTopologyIndex(start, count)
  const normalizedEnd = normalizeTopologyIndex(end, count)

  if (!isValidTopologyIndex(normalizedStart, count) || !isValidTopologyIndex(normalizedEnd, count)) {
    return
  }

  const step = normalizedStart <= normalizedEnd ? 1 : -1

  for (let index = normalizedStart; index !== normalizedEnd + step; index += step) {
    indexes.add(index)
  }
}

function addTopologyIndex (indexes, index, count) {
  const normalized = normalizeTopologyIndex(index, count)

  if (isValidTopologyIndex(normalized, count)) {
    indexes.add(normalized)
  }
}

function normalizeTopologyIndex (index, count) {
  if (!Number.isInteger(index)) {
    return NaN
  }

  return index < 0 ? count + index : index
}

function isValidTopologyIndex (index, count) {
  return Number.isInteger(index) && index >= 0 && index < count
}
