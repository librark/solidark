export const STEP_MIME_TYPE = 'model/step'
export const STL_MIME_TYPE = 'model/stl'
export const BREP_MIME_TYPE = 'model/vnd.opencascade.brep'

export function createCadExportBlob (data, mimeType, BlobConstructor = globalThis.Blob) {
  if (typeof BlobConstructor !== 'function') {
    throw new TypeError('Blob support is required to create CAD export blobs')
  }

  return new BlobConstructor([data], { type: mimeType })
}

export function createCadExportObjectUrl (data, options = {}) {
  const url = options.url || globalThis.URL

  if (!url || typeof url.createObjectURL !== 'function') {
    throw new TypeError('URL.createObjectURL support is required to create CAD export URLs')
  }

  const blob = createCadExportBlob(data, options.mimeType || 'application/octet-stream', options.Blob)

  return {
    blob,
    url: url.createObjectURL(blob)
  }
}

export function downloadCadExport (data, options = {}) {
  const document = options.document || globalThis.document
  const urlApi = options.url || globalThis.URL

  if (!document || typeof document.createElement !== 'function') {
    throw new TypeError('A document with createElement() is required to download CAD exports')
  }

  const object = createCadExportObjectUrl(data, {
    Blob: options.Blob,
    mimeType: options.mimeType,
    url: urlApi
  })
  const anchor = document.createElement('a')

  anchor.href = object.url
  anchor.download = options.filename || 'solidark-export'
  anchor.rel = 'noreferrer'

  if (anchor.style) {
    anchor.style.display = 'none'
  }

  document.body?.appendChild?.(anchor)
  anchor.click()
  anchor.remove?.()
  urlApi?.revokeObjectURL?.(object.url)

  return {
    ...object,
    anchor,
    filename: anchor.download
  }
}

export function downloadResultToBrep (result, options = {}) {
  return downloadCadExport(exportResultToBrep(result, options), {
    ...options,
    filename: options.filename || 'solidark-model.brep',
    mimeType: BREP_MIME_TYPE
  })
}

export function downloadResultToStep (result, options = {}) {
  return downloadCadExport(exportResultToStep(result, options), {
    ...options,
    filename: options.filename || 'solidark-model.step',
    mimeType: STEP_MIME_TYPE
  })
}

export function downloadResultToStl (result, options = {}) {
  return downloadCadExport(exportResultToStl(result, options), {
    ...options,
    filename: options.filename || 'solidark-model.stl',
    mimeType: STL_MIME_TYPE
  })
}

export function exportResultToBrep (result, options = {}) {
  return exportResultWithKernel('toBrep', result, options)
}

export function exportResultToStep (result, options = {}) {
  return exportResultWithKernel('toStep', result, options)
}

export function exportResultToStl (result, options = {}) {
  return exportResultWithKernel('toStl', result, options)
}

export function exportShapeToBrep (entry, options = {}) {
  return exportShapeWithKernel('toBrep', entry, options)
}

export function exportShapeToStep (entry, options = {}) {
  return exportShapeWithKernel('toStep', entry, options)
}

export function exportShapeToStl (entry, options = {}) {
  return exportShapeWithKernel('toStl', entry, options)
}

function exportShapeWithKernel (method, entry, options) {
  const kernel = exportKernel(options, method)

  return kernel[method](entry, options)
}

function exportResultWithKernel (method, result, options) {
  const kernel = exportKernel(options, method)
  const entry = exportEntryFromResult(result, kernel, options)

  return kernel[method](entry, options)
}

function exportKernel (options, method) {
  const kernel = options.kernel || globalThis.kernel

  if (!kernel || typeof kernel[method] !== 'function') {
    throw new TypeError(`Solidark kernel does not support ${method}()`)
  }

  return kernel
}

function exportEntryFromResult (result, kernel, options) {
  const shapes = Array.isArray(result?.shapes)
    ? result.shapes.filter(Boolean)
    : [result].filter(Boolean)

  if (shapes.length <= 1 || options.shape === 'first') {
    return shapes[0] || null
  }

  if (typeof kernel.group === 'function') {
    return kernel.group({ export: true, implicit: true }, shapes)
  }

  throw new TypeError('Solidark export result contains multiple shapes; provide a kernel with group() or pass shape: "first"')
}
