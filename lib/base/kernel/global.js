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
