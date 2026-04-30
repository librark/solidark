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
  method('sol-sketch', 'sketch', 'component'),
  method('sol-move', 'move', 'component'),
  method('sol-line', 'line', 'component'),
  method('sol-close', 'close', 'component'),
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
 * @typedef {object} Kernel
 * @property {string} name
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} cuboid
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} sphere
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} cylinder
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} cone
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} torus
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} circle
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} rectangle
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} polygon
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} polyline
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} translate
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} rotate
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} scale
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} mirror
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} matrix
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} place
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} workplane
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} union
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} difference
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} intersection
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} group
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} fillet
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} chamfer
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} shell
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} offset
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} extrude
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} revolve
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} sweep
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} loft
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} section
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} face
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} sketch
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} move
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} line
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} close
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} step
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} stl
 * @property {(properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape} brep
 * @property {(entry: KernelShape) => void} dispose
 *
 * @typedef {object} KernelShape
 * @property {string} category
 * @property {string} tag
 * @property {Record<string, unknown>} properties
 * @property {KernelShape[]} children
 * @property {boolean} disposed
 */
