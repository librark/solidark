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
  scheduleObjectUrlRevoke(urlApi, object.url, options)

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
  const meshes = exportMeshesFromResult(result, options)

  if (meshTriangleCount(meshes) > 0) {
    return exportMeshesToStl(meshes, options)
  }

  return exportResultWithKernel('toStl', result, options)
}

export function exportShapeToBrep (entry, options = {}) {
  return exportShapeWithKernel('toBrep', entry, options)
}

export function exportShapeToStep (entry, options = {}) {
  return exportShapeWithKernel('toStep', entry, options)
}

export function exportShapeToStl (entry, options = {}) {
  const mesh = meshFromEntry(entry)

  if (mesh && meshTriangleCount([mesh]) > 0) {
    return exportMeshesToStl([mesh], options)
  }

  return exportShapeWithKernel('toStl', entry, options)
}

export function exportMeshesToStl (meshes = [], options = {}) {
  const name = stlSolidName(options.name || options.solid || 'solidark')
  const lines = [`solid ${name}`]

  for (const mesh of meshes) {
    appendMeshStl(lines, mesh)
  }

  lines.push(`endsolid ${name}`)
  return `${lines.join('\n')}\n`
}

function exportShapeWithKernel (method, entry, options) {
  assertBrepExportable(method, entry)
  const kernel = exportKernel(options, method)

  return ensureCadExportData(kernel[method](entry, options), method)
}

function exportResultWithKernel (method, result, options) {
  const kernel = exportKernel(options, method)
  assertBrepExportable(method, result)
  const entry = exportEntryFromResult(result, kernel, options)

  return ensureCadExportData(kernel[method](entry, options), method)
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

function scheduleObjectUrlRevoke (urlApi, objectUrl, options) {
  if (options.revoke === false || typeof urlApi?.revokeObjectURL !== 'function') {
    return
  }

  const schedule = options.scheduleRevoke || globalThis.setTimeout
  const revoke = () => urlApi.revokeObjectURL(objectUrl)

  if (typeof schedule === 'function') {
    schedule(revoke, 0)
    return
  }

  revoke()
}

function ensureCadExportData (data, method) {
  if (exportDataSize(data) === 0) {
    throw new TypeError(`Solidark ${exportFormatName(method)} export produced no data`)
  }

  return data
}

function exportDataSize (data) {
  if (typeof data === 'string') {
    return data.length
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength
  }

  if (ArrayBuffer.isView(data)) {
    return data.byteLength
  }

  return data == null ? 0 : 1
}

function exportMeshesFromResult (result, options) {
  const meshes = Array.isArray(result?.meshes) ? result.meshes.filter(Boolean) : []

  return options.shape === 'first' ? meshes.slice(0, 1) : meshes
}

function meshFromEntry (entry) {
  if (entry?.mesh) {
    return entry.mesh
  }

  return entry?.vertices && entry?.triangles ? entry : null
}

function meshTriangleCount (meshes) {
  return meshes.reduce((count, mesh) => count + (mesh.triangles?.length || 0), 0)
}

function appendMeshStl (lines, mesh) {
  for (const triangle of mesh.triangles || []) {
    const vertices = triangle.map((index) => mesh.vertices[index])
    const normal = triangleNormal(vertices)

    lines.push(`  facet normal ${normal.join(' ')}`)
    lines.push('    outer loop')

    for (const vertex of vertices) {
      lines.push(`      vertex ${vertex.join(' ')}`)
    }

    lines.push('    endloop')
    lines.push('  endfacet')
  }
}

function triangleNormal ([[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const normal = [
    uy * vz - uz * vy,
    uz * vx - ux * vz,
    ux * vy - uy * vx
  ]
  const length = Math.hypot(...normal) || 1

  return normal.map((value) => value / length)
}

function stlSolidName (name) {
  return String(name).trim().replace(/\s+/g, '-') || 'solidark'
}

function assertBrepExportable (method, entry) {
  if (method === 'toStl' || !containsMeshOnlyGeometry(entry)) {
    return
  }

  throw new TypeError(`Solidark ${exportFormatName(method)} export requires B-Rep geometry; mesh-only STL imports cannot be represented in this format`)
}

function containsMeshOnlyGeometry (entry) {
  if (!entry || typeof entry !== 'object') {
    return false
  }

  if (Array.isArray(entry.shapes)) {
    return entry.shapes.some(containsMeshOnlyGeometry)
  }

  if (entry.mesh && !entry.value) {
    return true
  }

  return Array.isArray(entry.children) && entry.children.some(containsMeshOnlyGeometry)
}

function exportFormatName (method) {
  return {
    toBrep: 'BREP',
    toStep: 'STEP',
    toStl: 'STL'
  }[method]
}
