import { evaluateNode, loadGlobalKernel, setGlobalKernel, useInMemoryKernel } from './kernel/index.js'
import { normalizeElement } from './normalize.js'

/**
 * Runtime coordinator for loading kernels, scheduling work, and evaluating DOM trees.
 */
export class Runtime {
  constructor ({
    kernel,
    loader = loadGlobalKernel
  } = {}) {
    this.kernel = null
    this.kernelPromise = null
    this.loader = loader

    if (kernel !== undefined) {
      setGlobalKernel(kernel)
    }
  }

  configure ({ kernel, loader } = {}) {
    if (kernel !== undefined) {
      setGlobalKernel(kernel)
    }

    if (loader) {
      this.loader = loader
    }

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
    this.loader = loadGlobalKernel
    useInMemoryKernel()
    return this
  }
}

export const SolidarkRuntime = new Runtime()
