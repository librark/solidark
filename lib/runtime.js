import { createDescriptorKernel, evaluateNode } from './kernel.js'
import { normalizeElement } from './normalize.js'

/**
 * Runtime coordinator for loading kernels, scheduling work, and evaluating DOM trees.
 */
export class Runtime {
  constructor () {
    this.resetForTests()
  }

  configure ({ loader } = {}) {
    this.loader = loader || this.loader
    this.kernelPromise = null
    return this
  }

  load () {
    this.kernelPromise ||= Promise.resolve()
      .then(() => this.loader())
      .then((kernel) => {
        this.kernel = kernel
        return kernel
      })

    return this.kernelPromise
  }

  schedule (callback, { macro = false } = {}) {
    if (macro) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(callback()), 0)
      })
    }

    return Promise.resolve().then(callback)
  }

  async evaluate (element) {
    const kernel = await this.load()
    await this.flush(element)
    const model = normalizeElement(element)
    const shapes = evaluateNode(model, kernel)

    return {
      element,
      model,
      shapes,
      diagnostics: [],
      dispose () {
        shapes.forEach((entry) => kernel.dispose(entry))
      }
    }
  }

  async flush (element) {
    await element.rendered
    await element.updated

    for (const child of element.children || []) {
      await this.flush(child)
    }

    return element
  }

  resetForTests () {
    this.kernel = null
    this.kernelPromise = null
    this.loader = () => createDescriptorKernel()
    return this
  }
}

export const SolidarkRuntime = new Runtime()
