/**
 * Creates a descriptor kernel used until the OpenCascade.js adapter is wired in.
 *
 * @returns {DescriptorKernel}
 */
export function createDescriptorKernel () {
  return {
    primitive: (tag, properties) => shape('primitive', tag, properties),
    transform: (tag, properties, children) => shape('transform', tag, properties, children),
    operation: (tag, properties, children) => shape('operation', tag, properties, children),
    feature: (tag, properties, children) => shape('feature', tag, properties, children),
    external: (tag, properties) => shape('external', tag, properties),
    dispose: (entry) => {
      entry.disposed = true
    }
  }
}

/**
 * Evaluates a normalized model using the provided kernel adapter.
 *
 * @param {import("./normalize.js").NormalizedNode} node
 * @param {DescriptorKernel} kernel
 * @returns {DescriptorShape[]}
 */
export function evaluateNode (node, kernel = createDescriptorKernel()) {
  const children = node.children.flatMap((child) => evaluateNode(child, kernel))

  if (node.tag === 'sol-model') {
    return evaluateModelNode(node, children, kernel)
  }

  if (node.category === 'primitive') {
    return [kernel.primitive(node.tag, node.properties)]
  }

  if (node.category === 'transform') {
    return [kernel.transform(node.tag, node.properties, children)]
  }

  if (node.category === 'operation') {
    return [kernel.operation(node.tag, node.properties, children)]
  }

  if (node.category === 'feature') {
    return [kernel.feature(node.tag, node.properties, children)]
  }

  if (node.category === 'external') {
    return [kernel.external(node.tag, node.properties)]
  }

  return children
}

function evaluateModelNode (node, children, kernel) {
  if (children.length === 0) {
    return []
  }

  if (node.implicitUnion) {
    return [kernel.operation('sol-union', { implicit: true }, children)]
  }

  return children
}

function shape (category, tag, properties, children = []) {
  return {
    category,
    tag,
    properties,
    children,
    disposed: false
  }
}

/**
 * @typedef {object} DescriptorKernel
 * @property {(tag: string, properties: Record<string, unknown>) => DescriptorShape} primitive
 * @property {(tag: string, properties: Record<string, unknown>, children: DescriptorShape[]) => DescriptorShape} transform
 * @property {(tag: string, properties: Record<string, unknown>, children: DescriptorShape[]) => DescriptorShape} operation
 * @property {(tag: string, properties: Record<string, unknown>, children: DescriptorShape[]) => DescriptorShape} feature
 * @property {(tag: string, properties: Record<string, unknown>) => DescriptorShape} external
 * @property {(entry: DescriptorShape) => void} dispose
 *
 * @typedef {object} DescriptorShape
 * @property {string} category
 * @property {string} tag
 * @property {Record<string, unknown>} properties
 * @property {DescriptorShape[]} children
 * @property {boolean} disposed
 */
