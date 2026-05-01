import { createInMemoryKernel, getGlobalKernel, setGlobalKernel } from '../../base/kernel/index.js'
import { createOpenCascadeKernel } from './opencascade.js'

export { clearGlobalKernel, getGlobalKernel, setGlobalKernel } from '../../base/kernel/index.js'

/**
 * Loads the configured global kernel, installing OpenCascade.js by default.
 *
 * @param {object} options
 * @param {Record<string, unknown>} options.target
 * @param {() => unknown} options.factory
 * @returns {unknown}
 */
export function loadGlobalKernel ({
  target = globalThis,
  factory = createOpenCascadeKernel
} = {}) {
  let kernel = getGlobalKernel(target)

  if (!kernel) {
    kernel = factory()
    setGlobalKernel(kernel, target)
  }

  return kernel
}

/**
 * Installs the in-memory kernel for tests and descriptor previews.
 *
 * @param {object} options
 * @param {Record<string, unknown>} options.target
 * @returns {import("../../base/kernel/memory.js").MemoryKernel}
 */
export function useInMemoryKernel ({ target = globalThis } = {}) {
  return setGlobalKernel(createInMemoryKernel(), target)
}
