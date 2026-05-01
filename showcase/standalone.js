import { configureShowcaseKernel } from './kernel.js'

export async function bootStandaloneShowcase ({
  configureKernel = configureShowcaseKernel,
  defineElements
} = {}) {
  const mode = configureKernel()
  const define = defineElements || await loadSolidarkElements()

  define()
  return mode
}

async function loadSolidarkElements () {
  const { defineSolidarkElements } = await import('../lib/elements.js')

  return defineSolidarkElements
}

/* node:coverage ignore next 3 */
if (globalThis.document) {
  bootStandaloneShowcase()
}
