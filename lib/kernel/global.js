import { createInMemoryKernel } from './in-memory.js'
import { createOpenCascadeKernel } from './opencascade.js'

/**
 * Reads the process-wide Solidark kernel.
 *
 * @param {Record<string, unknown>} target
 * @returns {unknown}
 */
export function getGlobalKernel (target = globalThis) {
  return target.kernel
}

/**
 * Sets the process-wide Solidark kernel.
 *
 * @param {unknown} kernel
 * @param {Record<string, unknown>} target
 * @returns {unknown}
 */
export function setGlobalKernel (kernel, target = globalThis) {
  target.kernel = kernel
  return kernel
}

/**
 * Removes the process-wide Solidark kernel.
 *
 * @param {Record<string, unknown>} target
 * @returns {Record<string, unknown>}
 */
export function clearGlobalKernel (target = globalThis) {
  delete target.kernel
  return target
}

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
 * @returns {import("./in-memory.js").DescriptorKernel}
 */
export function useInMemoryKernel ({ target = globalThis } = {}) {
  return setGlobalKernel(createInMemoryKernel(), target)
}
