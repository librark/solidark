import { createInMemoryKernel } from './in-memory.js'

/**
 * Evaluates a normalized model using the provided kernel adapter.
 *
 * @param {import("../normalize.js").NormalizedNode} node
 * @param {import("./in-memory.js").DescriptorKernel} kernel
 * @returns {import("./in-memory.js").DescriptorShape[]}
 */
export function evaluateNode (node, kernel = createInMemoryKernel()) {
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
