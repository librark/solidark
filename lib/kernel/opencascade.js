import { createInMemoryKernel } from './in-memory.js'

/**
 * Loads OpenCascade.js using the stable v1 runtime entrypoint.
 *
 * @param {object} options
 * @param {(specifier: string) => Promise<{ initOpenCascade?: (options?: unknown) => Promise<unknown> }>} options.importer
 * @param {unknown} options.initOptions
 * @returns {Promise<unknown>}
 */
export async function loadOpenCascade ({
  importer = importOpenCascadeModule,
  initOptions
} = {}) {
  const module = await importer('opencascade.js')

  if (typeof module.initOpenCascade !== 'function') {
    throw new TypeError('opencascade.js must export initOpenCascade')
  }

  return module.initOpenCascade(initOptions)
}

/**
 * Creates the OpenCascade-backed kernel adapter boundary.
 *
 * The in-memory operations remain available while primitive and operation
 * translations are implemented incrementally against the loaded OCCT module.
 *
 * @param {object} options
 * @returns {Promise<import("./contract.js").Kernel & { openCascade: unknown }>}
 */
export async function createOpenCascadeKernel (options = {}) {
  const openCascade = await loadOpenCascade(options)

  return {
    ...createInMemoryKernel(),
    name: 'opencascade',
    openCascade
  }
}

/* node:coverage ignore next 3 */
function importOpenCascadeModule (specifier) {
  return import(specifier)
}
