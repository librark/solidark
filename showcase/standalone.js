import { defineSolidarkElements } from '../lib/index.js'
import { configureShowcaseKernel } from './kernel.js'

export function bootStandaloneShowcase ({
  configureKernel = configureShowcaseKernel,
  defineElements = defineSolidarkElements
} = {}) {
  defineElements()
  return configureKernel()
}

/* node:coverage ignore next 3 */
if (globalThis.document) {
  bootStandaloneShowcase()
}
