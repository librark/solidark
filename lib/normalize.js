/**
 * Converts a Solidark custom element subtree into an inspectable descriptor.
 *
 * @param {Element} element
 * @returns {NormalizedNode}
 */
export function normalizeElement (element) {
  const children = Array.from(element.children || [], normalizeElement)
  const tag = element.localName || element.tagName.toLowerCase()
  const category = element.constructor.category || 'component'
  const geometryKind = element.constructor.geometryKind || null

  return {
    tag,
    category,
    geometryKind,
    properties: element.properties || {},
    children,
    implicitUnion: tag === 'sol-model' && children.filter(producesGeometry).length > 1
  }
}

/**
 * Returns whether a normalized node produces geometry.
 *
 * @param {NormalizedNode} node
 * @returns {boolean}
 */
export function producesGeometry (node) {
  return node.geometryKind !== null || node.children.some(producesGeometry)
}

/**
 * @typedef {object} NormalizedNode
 * @property {string} tag
 * @property {string} category
 * @property {string | null} geometryKind
 * @property {Record<string, unknown>} properties
 * @property {NormalizedNode[]} children
 * @property {boolean} implicitUnion
 */
