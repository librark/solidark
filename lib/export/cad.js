export const STEP_MIME_TYPE = 'model/step'
export const STL_MIME_TYPE = 'model/stl'

export function exportShapeToStep (entry, options = {}) {
  return exportShapeWithKernel('toStep', entry, options)
}

export function exportShapeToStl (entry, options = {}) {
  return exportShapeWithKernel('toStl', entry, options)
}

function exportShapeWithKernel (method, entry, options) {
  const kernel = options.kernel || globalThis.kernel

  if (!kernel || typeof kernel[method] !== 'function') {
    throw new TypeError(`Solidark kernel does not support ${method}()`)
  }

  return kernel[method](entry, options)
}
