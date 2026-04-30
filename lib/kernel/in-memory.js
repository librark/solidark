import { kernelCategoryByMethod, kernelMethodDefinitions, kernelTagByMethod } from './contract.js'

/**
 * Creates an in-memory descriptor kernel for tests and lightweight previews.
 *
 * @returns {import("./contract.js").Kernel}
 */
export function createInMemoryKernel () {
  const kernel = {
    name: 'in-memory',
    dispose: (entry) => {
      entry.disposed = true
    }
  }

  for (const { method } of kernelMethodDefinitions) {
    kernel[method] = (properties = {}, children = []) => shape(
      kernelCategoryByMethod[method],
      kernelTagByMethod[method],
      properties,
      children
    )
  }

  return kernel
}

export const createDescriptorKernel = createInMemoryKernel

function shape (category, tag, properties, children = []) {
  return {
    category,
    tag,
    properties,
    children,
    disposed: false
  }
}

/**
 * @typedef {import("./contract.js").Kernel} DescriptorKernel
 * @typedef {import("./contract.js").KernelShape} DescriptorShape
 */
