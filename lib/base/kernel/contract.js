export class Kernel {
  constructor ({ name = 'kernel' } = {}) {
    if (new.target === Kernel) {
      throw new TypeError('Kernel is abstract and cannot be instantiated directly')
    }

    this.name = name
  }

  createShape (category, tag, properties = {}, children = []) {
    return {
      category,
      tag,
      properties,
      children,
      disposed: false
    }
  }

  toMesh () {
    return null
  }

  dispose (entry) {
    entry.disposed = true
  }
}

export const kernelMethodDefinitions = Object.freeze([
  method('sol-cuboid', 'cuboid', 'primitive'),
  method('sol-sphere', 'sphere', 'primitive'),
  method('sol-cylinder', 'cylinder', 'primitive'),
  method('sol-cone', 'cone', 'primitive'),
  method('sol-torus', 'torus', 'primitive'),
  method('sol-circle', 'circle', 'primitive'),
  method('sol-rectangle', 'rectangle', 'primitive'),
  method('sol-polygon', 'polygon', 'primitive'),
  method('sol-polyline', 'polyline', 'primitive'),
  method('sol-translate', 'translate', 'transform'),
  method('sol-rotate', 'rotate', 'transform'),
  method('sol-scale', 'scale', 'transform'),
  method('sol-mirror', 'mirror', 'transform'),
  method('sol-matrix', 'matrix', 'transform'),
  method('sol-place', 'place', 'transform'),
  method('sol-workplane', 'workplane', 'transform'),
  method('sol-union', 'union', 'operation'),
  method('sol-difference', 'difference', 'operation'),
  method('sol-intersection', 'intersection', 'operation'),
  method('sol-group', 'group', 'operation'),
  method('sol-fillet', 'fillet', 'feature'),
  method('sol-chamfer', 'chamfer', 'feature'),
  method('sol-shell', 'shell', 'feature'),
  method('sol-offset', 'offset', 'feature'),
  method('sol-extrude', 'extrude', 'feature'),
  method('sol-revolve', 'revolve', 'feature'),
  method('sol-sweep', 'sweep', 'feature'),
  method('sol-loft', 'loft', 'feature'),
  method('sol-section', 'section', 'feature'),
  method('sol-face', 'face', 'feature'),
  method('sol-sketch', 'sketch', 'sketch'),
  method('sol-move', 'move', 'sketch'),
  method('sol-line', 'line', 'sketch'),
  method('sol-close', 'close', 'sketch'),
  method('sol-step', 'step', 'external'),
  method('sol-stl', 'stl', 'external'),
  method('sol-brep', 'brep', 'external')
])

export const kernelMethodByTag = Object.freeze(
  Object.fromEntries(kernelMethodDefinitions.map(({ tag, method }) => [tag, method]))
)

export const kernelCategoryByMethod = Object.freeze(
  Object.fromEntries(kernelMethodDefinitions.map(({ method, category }) => [method, category]))
)

export const kernelTagByMethod = Object.freeze(
  Object.fromEntries(kernelMethodDefinitions.map(({ method, tag }) => [method, tag]))
)

export function kernelMethodForTag (tag) {
  return kernelMethodByTag[tag] || null
}

export function requireKernelMethod (kernel, tag) {
  const methodName = kernelMethodForTag(tag)

  if (!methodName) {
    return null
  }

  if (typeof kernel[methodName] !== 'function') {
    throw new TypeError(`Kernel does not implement ${methodName}() for ${tag}`)
  }

  return kernel[methodName]
}

function method (tag, method, category) {
  return Object.freeze({ tag, method, category })
}

/**
 * @typedef {object} KernelShape
 * @property {string} category
 * @property {string} tag
 * @property {Record<string, unknown>} properties
 * @property {KernelShape[]} children
 * @property {unknown} [value]
 * @property {unknown[]} [handles]
 * @property {boolean} disposed
 */
