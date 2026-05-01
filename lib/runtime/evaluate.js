import { getDefinedElement } from '../dom.js'

/**
 * Evaluates a normalized model using the provided kernel adapter.
 *
 * @param {import("../normalize.js").NormalizedNode} node
 * @param {import("../base/kernel/contract.js").Kernel} kernel
 * @returns {import("../base/kernel/contract.js").KernelShape[]}
 */
export function evaluateNode (node, kernel) {
  const children = node.children.flatMap((child) => evaluateNode(child, kernel))
  const ComponentClass = getDefinedElement(node.tag)

  return typeof ComponentClass?.evaluateNode === 'function'
    ? ComponentClass.evaluateNode(node, children, kernel)
    : children
}
