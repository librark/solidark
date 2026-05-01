export const GLB_MIME_TYPE = 'model/gltf-binary'

const GLB_MAGIC = 0x46546c67
const GLB_VERSION = 2
const CHUNK_JSON = 0x4e4f534a
const CHUNK_BIN = 0x004e4942
const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963
const FLOAT = 5126
const UNSIGNED_INT = 5125
const TRIANGLES = 4
const MATERIAL_COLORS = [
  [0.26, 0.74, 0.72],
  [0.42, 0.63, 0.89],
  [0.63, 0.58, 0.86],
  [0.78, 0.62, 0.38],
  [0.48, 0.72, 0.42],
  [0.82, 0.47, 0.52]
]
const NAMED_COLORS = Object.freeze({
  black: [0, 0, 0, 1],
  blue: [0, 0, 1, 1],
  cyan: [0, 1, 1, 1],
  gray: [0.5, 0.5, 0.5, 1],
  green: [0, 0.5019607843137255, 0, 1],
  grey: [0.5, 0.5, 0.5, 1],
  magenta: [1, 0, 1, 1],
  red: [1, 0, 0, 1],
  tomato: [1, 0.38823529411764707, 0.2784313725490196, 1],
  white: [1, 1, 1, 1],
  yellow: [1, 1, 0, 1]
})
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Exports renderable triangle meshes as a binary glTF 2.0 asset.
 *
 * @param {import("../index.js").RenderableMesh[]} meshes
 * @param {{ generator?: string }} options
 * @returns {ArrayBuffer}
 */
export function exportMeshesToGlb (meshes = [], options = {}) {
  const gltf = createGltfDocument(options)
  const segments = []

  for (const mesh of meshes) {
    appendGltfMesh(gltf, segments, mesh)
  }

  const binary = concatenateSegments(segments)
  gltf.buffers.push({ byteLength: binary.byteLength })

  return createGlb(gltf, binary)
}

/**
 * Creates a GLB Blob from renderable triangle meshes.
 *
 * @param {import("../index.js").RenderableMesh[]} meshes
 * @param {{ generator?: string }} options
 * @returns {Blob}
 */
export function createGlbBlob (meshes = [], options = {}) {
  return new Blob([exportMeshesToGlb(meshes, options)], { type: GLB_MIME_TYPE })
}

/**
 * Creates an object URL for a GLB asset and returns the URL plus its Blob.
 *
 * @param {import("../index.js").RenderableMesh[]} meshes
 * @param {{ generator?: string }} options
 * @param {{ createObjectURL?: (blob: Blob) => string }} url
 * @returns {{ blob: Blob, url: string }}
 */
export function createGlbObjectUrl (meshes = [], options = {}, url = globalThis.URL) {
  if (!url || typeof url.createObjectURL !== 'function') {
    throw new TypeError('URL.createObjectURL is required to create a GLB object URL')
  }

  const blob = createGlbBlob(meshes, options)

  return {
    blob,
    url: url.createObjectURL(blob)
  }
}

function createGltfDocument ({ generator = 'solidark' } = {}) {
  return {
    asset: {
      version: '2.0',
      generator
    },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    buffers: [],
    bufferViews: [],
    accessors: []
  }
}

function appendGltfMesh (gltf, segments, mesh) {
  const geometry = createMeshGeometry(mesh)

  if (geometry.indices.length === 0) {
    return
  }

  const meshIndex = gltf.meshes.length
  const positionAccessor = appendAccessor(gltf, segments, geometry.positions, {
    target: ARRAY_BUFFER,
    componentType: FLOAT,
    type: 'VEC3',
    count: geometry.vertexCount,
    min: geometry.min,
    max: geometry.max
  })
  const normalAccessor = appendAccessor(gltf, segments, geometry.normals, {
    target: ARRAY_BUFFER,
    componentType: FLOAT,
    type: 'VEC3',
    count: geometry.vertexCount
  })
  const indexAccessor = appendAccessor(gltf, segments, geometry.indices, {
    target: ELEMENT_ARRAY_BUFFER,
    componentType: UNSIGNED_INT,
    type: 'SCALAR',
    count: geometry.indices.length,
    min: [0],
    max: [geometry.vertexCount - 1]
  })

  gltf.materials.push(createMaterial(meshIndex, mesh.color ?? mesh.styling?.color))
  gltf.meshes.push({
    name: mesh.tag || `mesh-${meshIndex}`,
    primitives: [{
      attributes: {
        POSITION: positionAccessor,
        NORMAL: normalAccessor
      },
      indices: indexAccessor,
      material: meshIndex,
      mode: TRIANGLES
    }]
  })
  gltf.nodes.push({ mesh: meshIndex, name: mesh.tag || `node-${meshIndex}` })
  gltf.scenes[0].nodes.push(meshIndex)
}

function createMeshGeometry (mesh) {
  const positions = new Float32Array(mesh.vertices.length * 3)
  const normals = new Float32Array(mesh.vertices.length * 3)
  const indices = new Uint32Array(mesh.triangles.length * 3)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  mesh.vertices.forEach((vertex, index) => {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(vertex[axis] || 0)
      positions[index * 3 + axis] = value
      min[axis] = Math.min(min[axis], value)
      max[axis] = Math.max(max[axis], value)
    }
  })

  mesh.triangles.forEach((triangle, triangleIndex) => {
    const offset = triangleIndex * 3
    indices[offset] = triangle[0]
    indices[offset + 1] = triangle[1]
    indices[offset + 2] = triangle[2]
    accumulateTriangleNormal(positions, normals, triangle)
  })

  normalizeNormals(normals)

  return {
    positions,
    normals,
    indices,
    vertexCount: mesh.vertices.length,
    min: finiteBounds(min),
    max: finiteBounds(max)
  }
}

function accumulateTriangleNormal (positions, normals, triangle) {
  const a = readVector(positions, triangle[0])
  const b = readVector(positions, triangle[1])
  const c = readVector(positions, triangle[2])
  const normal = cross(subtract(b, a), subtract(c, a))

  for (const vertexIndex of triangle) {
    normals[vertexIndex * 3] += normal[0]
    normals[vertexIndex * 3 + 1] += normal[1]
    normals[vertexIndex * 3 + 2] += normal[2]
  }
}

function normalizeNormals (normals) {
  for (let index = 0; index < normals.length; index += 3) {
    const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1

    normals[index] /= length
    normals[index + 1] /= length
    normals[index + 2] /= length
  }
}

function readVector (positions, index) {
  return [
    positions[index * 3],
    positions[index * 3 + 1],
    positions[index * 3 + 2]
  ]
}

function subtract (left, right) {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  ]
}

function cross (left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ]
}

function finiteBounds (bounds) {
  return bounds.map((value) => Number.isFinite(value) ? value : 0)
}

function appendAccessor (gltf, segments, data, accessor) {
  const bufferView = gltf.bufferViews.length

  segments.push({ data, target: accessor.target })
  gltf.bufferViews.push({
    buffer: 0,
    byteOffset: 0,
    byteLength: data.byteLength,
    target: accessor.target
  })
  gltf.accessors.push({
    bufferView,
    byteOffset: 0,
    componentType: accessor.componentType,
    count: accessor.count,
    type: accessor.type,
    min: accessor.min,
    max: accessor.max
  })

  return gltf.accessors.length - 1
}

function concatenateSegments (segments) {
  const byteLength = segments.reduce((total, segment) => total + paddingFor(total) + segment.data.byteLength, 0)
  const result = new Uint8Array(byteLength)
  let offset = 0

  segments.forEach((segment, index) => {
    offset += paddingFor(offset)
    segment.byteOffset = offset
    copyBytes(result, segment.data, offset)
    offset += segment.data.byteLength
    segment.index = index
  })

  return result
}

function copyBytes (target, data, offset) {
  target.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), offset)
}

function createGlb (gltf, binary) {
  applyBufferViewOffsets(gltf, binary)

  const json = encodeJsonChunk(gltf)
  const bin = padBytes(binary, 0)
  const byteLength = 12 + 8 + json.byteLength + 8 + bin.byteLength
  const glb = new ArrayBuffer(byteLength)
  const bytes = new Uint8Array(glb)
  const view = new DataView(glb)

  view.setUint32(0, GLB_MAGIC, true)
  view.setUint32(4, GLB_VERSION, true)
  view.setUint32(8, byteLength, true)
  writeChunkHeader(view, 12, json.byteLength, CHUNK_JSON)
  bytes.set(json, 20)
  writeChunkHeader(view, 20 + json.byteLength, bin.byteLength, CHUNK_BIN)
  bytes.set(bin, 28 + json.byteLength)

  return glb
}

function applyBufferViewOffsets (gltf, binary) {
  let offset = 0

  gltf.bufferViews.forEach((bufferView) => {
    offset += paddingFor(offset)
    bufferView.byteOffset = offset
    offset += bufferView.byteLength
  })

  gltf.buffers[0].byteLength = binary.byteLength
}

function encodeJsonChunk (gltf) {
  const bytes = new TextEncoder().encode(JSON.stringify(gltf))

  return padBytes(bytes, 0x20)
}

function padBytes (bytes, value) {
  const padding = paddingFor(bytes.byteLength)
  const padded = new Uint8Array(bytes.byteLength + padding)

  padded.set(bytes)
  padded.fill(value, bytes.byteLength)

  return padded
}

function paddingFor (byteLength) {
  return (4 - (byteLength % 4)) % 4
}

function writeChunkHeader (view, offset, length, type) {
  view.setUint32(offset, length, true)
  view.setUint32(offset + 4, type, true)
}

function createMaterial (index, colorValue) {
  const color = colorFactorFromValue(colorValue) || [...MATERIAL_COLORS[index % MATERIAL_COLORS.length], 1]

  return {
    name: `solidark-material-${index}`,
    doubleSided: true,
    pbrMetallicRoughness: {
      baseColorFactor: color,
      metallicFactor: 0,
      roughnessFactor: 0.58
    }
  }
}

function colorFactorFromValue (value) {
  if (Array.isArray(value)) {
    return normalizeColorArray(value)
  }

  if (typeof value === 'string') {
    return colorFactorFromString(value.trim().toLowerCase())
  }

  return null
}

function colorFactorFromString (value) {
  const named = NAMED_COLORS[value]

  if (named) {
    return named
  }

  if (HEX_COLOR.test(value)) {
    return colorFactorFromHex(value.slice(1))
  }

  const values = colorNumbersFromString(value)

  return values.length >= 3 ? normalizeColorArray(values) : null
}

function colorFactorFromHex (hex) {
  const parts = hex.length < 5
    ? Array.from(hex, (character) => character + character)
    : hex.match(/[0-9a-f]{2}/gi)

  return normalizeColorArray(parts.map((part) => Number.parseInt(part, 16)))
}

function colorNumbersFromString (value) {
  const match = value.match(/^rgba?\((.*)\)$/)
  const source = match ? match[1] : value

  return source
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

function normalizeColorArray (values) {
  const scale = values.slice(0, 3).some((value) => value > 1) ? 255 : 1
  const alpha = values[3] === undefined ? 1 : values[3]

  return [
    clamp01(Number(values[0] || 0) / scale),
    clamp01(Number(values[1] || 0) / scale),
    clamp01(Number(values[2] || 0) / scale),
    clamp01(Number(alpha) > 1 ? Number(alpha) / 255 : Number(alpha))
  ]
}

function clamp01 (value) {
  return Math.min(1, Math.max(0, value))
}
