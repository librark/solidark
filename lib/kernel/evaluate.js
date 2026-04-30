import { requireKernelMethod } from './contract.js'
import { createInMemoryKernel } from './in-memory.js'

/**
 * Evaluates a normalized model using the provided kernel adapter.
 *
 * @param {import("../normalize.js").NormalizedNode} node
 * @param {import("./contract.js").Kernel} kernel
 * @returns {import("./contract.js").KernelShape[]}
 */
export function evaluateNode (node, kernel = createInMemoryKernel()) {
  const children = node.children.flatMap((child) => evaluateNode(child, kernel))

  if (node.tag === 'sol-model') {
    return evaluateModelNode(node, children, kernel)
  }

  const compile = requireKernelMethod(kernel, node.tag)

  if (compile) {
    return [compile.call(kernel, node.properties, children)]
  }

  return children
}

function evaluateModelNode (node, children, kernel) {
  if (children.length === 0) {
    return []
  }

  if (node.implicitUnion) {
    return [kernel.union({ implicit: true }, children)]
  }

  return children
}
