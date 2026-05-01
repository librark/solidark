import { Kernel, kernelCategoryByMethod, kernelMethodDefinitions, kernelTagByMethod } from './contract.js'

export class MemoryKernel extends Kernel {
  constructor () {
    super({ name: 'in-memory' })
  }
}

for (const { method } of kernelMethodDefinitions) {
  MemoryKernel.prototype[method] = function createMemoryShape (properties = {}, children = []) {
    return this.createShape(
      kernelCategoryByMethod[method],
      kernelTagByMethod[method],
      properties,
      children
    )
  }
}

/**
 * Creates an in-memory descriptor kernel for tests and lightweight previews.
 *
 * @returns {MemoryKernel}
 */
export function createInMemoryKernel () {
  return new MemoryKernel()
}

export const createDescriptorKernel = createInMemoryKernel

/**
 * @typedef {import("./contract.js").KernelShape} DescriptorShape
 */
