/**
 * Creates an in-memory descriptor kernel for tests and lightweight previews.
 *
 * @returns {DescriptorKernel}
 */
export function createInMemoryKernel () {
  return {
    name: 'in-memory',
    primitive: (tag, properties) => shape('primitive', tag, properties),
    transform: (tag, properties, children) => shape('transform', tag, properties, children),
    operation: (tag, properties, children) => shape('operation', tag, properties, children),
    feature: (tag, properties, children) => shape('feature', tag, properties, children),
    external: (tag, properties) => shape('external', tag, properties),
    dispose: (entry) => {
      entry.disposed = true
    }
  }
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
 * @typedef {object} DescriptorKernel
 * @property {string} name
 * @property {(tag: string, properties: Record<string, unknown>) => DescriptorShape} primitive
 * @property {(tag: string, properties: Record<string, unknown>, children: DescriptorShape[]) => DescriptorShape} transform
 * @property {(tag: string, properties: Record<string, unknown>, children: DescriptorShape[]) => DescriptorShape} operation
 * @property {(tag: string, properties: Record<string, unknown>, children: DescriptorShape[]) => DescriptorShape} feature
 * @property {(tag: string, properties: Record<string, unknown>) => DescriptorShape} external
 * @property {(entry: DescriptorShape) => void} dispose
 *
 * @typedef {object} DescriptorShape
 * @property {string} category
 * @property {string} tag
 * @property {Record<string, unknown>} properties
 * @property {DescriptorShape[]} children
 * @property {boolean} disposed
 */
