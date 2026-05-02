export function parseTopologySelector (selection, count) {
  return resolveTopologySelector(selection, count)
}

export function resolveTopologySelector (selection, count, namedSelectors = {}) {
  const indexes = new Set()

  for (const token of topologySelectorTokens(selection)) {
    const name = String(token).trim()

    if (namedSelectors[name] !== undefined) {
      mergeTopologyIndexes(indexes, resolveTopologySelector(namedSelectors[name], count, namedSelectors))
    } else {
      addTopologySelectorToken(indexes, token, count)
    }
  }

  return indexes
}

export function parseTopologyNames (value) {
  if (!value) {
    return null
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return normalizeTopologyNames(value)
  }

  return normalizeTopologyNames(entriesTopologyNames(String(value).trim().split(/[\s;]+/).filter(Boolean)))
}

function entriesTopologyNames (entries) {
  const topology = { edges: {}, faces: {} }

  for (const entry of entries) {
    const parts = entry.split(':')

    if (parts.length < 3) {
      continue
    }

    const [left, middle, ...rest] = parts
    const right = rest.join(':')
    const kind = topologyKind(middle) || topologyKind(left)
    const name = topologyKind(middle) ? left : middle

    if (kind && name) {
      topology[kind][name] = right
    }
  }

  return topology
}

function normalizeTopologyNames (value) {
  const topology = {
    edges: normalizeNamedTopologySelectors(value.edges || value.edge),
    faces: normalizeNamedTopologySelectors(value.faces || value.face)
  }

  return Object.keys(topology.edges).length > 0 || Object.keys(topology.faces).length > 0
    ? topology
    : null
}

function normalizeNamedTopologySelectors (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(([name, selection]) => name && selection !== undefined)
  )
}

function topologyKind (value) {
  const normalized = String(value).toLowerCase()

  if (normalized === 'edge' || normalized === 'edges') {
    return 'edges'
  }

  if (normalized === 'face' || normalized === 'faces') {
    return 'faces'
  }

  return null
}

function mergeTopologyIndexes (target, source) {
  for (const index of source) {
    target.add(index)
  }
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
