const STL_VERTEX_PATTERN = /vertex\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)/ig

/**
 * Parses STL source data into Solidark's renderable mesh format.
 *
 * @param {string | ArrayBuffer | Uint8Array} source
 * @param {string} tag
 * @returns {{ tag: string, vertices: number[][], triangles: number[][] } | null}
 */
export function parseStlMesh (source, tag = 'sol-stl') {
  const bytes = sourceBytes(source)

  if (isBinaryStl(bytes)) {
    return parseBinaryStl(bytes, tag)
  }

  return parseAsciiStl(sourceText(source, bytes), tag)
}

function sourceBytes (source) {
  if (source instanceof Uint8Array) {
    return source
  }

  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source)
  }

  return new TextEncoder().encode(String(source ?? ''))
}

function sourceText (source, bytes) {
  return typeof source === 'string' ? source : new TextDecoder().decode(bytes)
}

function isBinaryStl (bytes) {
  if (bytes.byteLength < 84) {
    return false
  }

  const triangleCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true)

  return 84 + triangleCount * 50 === bytes.byteLength
}

function parseBinaryStl (bytes, tag) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const triangleCount = view.getUint32(80, true)
  const vertices = []
  const triangles = []

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    const triangle = []
    const offset = 84 + triangleIndex * 50 + 12

    for (let vertexIndex = 0; vertexIndex < 3; vertexIndex += 1) {
      const vertexOffset = offset + vertexIndex * 12

      triangle.push(vertices.length)
      vertices.push([
        view.getFloat32(vertexOffset, true),
        view.getFloat32(vertexOffset + 4, true),
        view.getFloat32(vertexOffset + 8, true)
      ])
    }

    triangles.push(triangle)
  }

  return triangles.length > 0 ? { tag, vertices, triangles } : null
}

function parseAsciiStl (text, tag) {
  const vertices = []
  const triangles = []
  let triangle = []

  for (const match of text.matchAll(STL_VERTEX_PATTERN)) {
    triangle.push(vertices.length)
    vertices.push([Number(match[1]), Number(match[2]), Number(match[3])])

    if (triangle.length === 3) {
      triangles.push(triangle)
      triangle = []
    }
  }

  return triangles.length > 0 ? { tag, vertices, triangles } : null
}
