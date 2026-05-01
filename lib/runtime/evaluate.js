import { getDefinedElement } from '../dom.js'

export class SolidarkEvaluationError extends Error {
  constructor (diagnostic, cause) {
    super(formatDiagnosticMessage(diagnostic), { cause })
    this.name = 'SolidarkEvaluationError'
    this.diagnostic = diagnostic
    this.diagnostics = [diagnostic]
  }
}

/**
 * Evaluates a normalized model using the provided kernel adapter.
 *
 * @param {import("../normalize.js").NormalizedNode} node
 * @param {import("../base/kernel/contract.js").Kernel} kernel
 * @returns {import("../base/kernel/contract.js").KernelShape[]}
 */
export function evaluateNode (node, kernel, context = {}) {
  const path = [...(context.path || []), pathSegment(node, context.index)]
  const children = node.children.flatMap((child, index) => evaluateNode(child, kernel, { path, index }))
  const ComponentClass = getDefinedElement(node.tag)

  if (typeof ComponentClass?.evaluateNode !== 'function') {
    return children
  }

  try {
    return ComponentClass.evaluateNode(node, children, kernel)
  } catch (error) {
    throw wrapEvaluationError(error, {
      category: node.category,
      method: kernelMethodForNode(node, ComponentClass),
      path: path.join(' > '),
      properties: node.properties,
      stage: 'evaluate',
      tag: node.tag
    })
  }
}

export function wrapEvaluationError (error, diagnostic) {
  if (error instanceof SolidarkEvaluationError) {
    return error
  }

  return new SolidarkEvaluationError({
    ...diagnostic,
    cause: errorMessage(error),
    level: 'error'
  }, error)
}

export function errorMessage (error) {
  return error instanceof Error ? error.message : String(error)
}

function kernelMethodForNode (node, ComponentClass) {
  return (ComponentClass.shapeTag || node.tag).replace(/^sol-/, '')
}

function pathSegment (node, index) {
  return index === undefined ? node.tag : `${node.tag}[${index}]`
}

function formatDiagnosticMessage (diagnostic) {
  return `Failed to ${diagnostic.stage} ${diagnostic.tag} at ${diagnostic.path}: ${diagnostic.cause}`
}
