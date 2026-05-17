import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseStlMesh } from './stl-mesh.js'

it('parses binary STL sources into renderable meshes', () => {
  const source = createBinaryStl([
    [[0, 0, 0], [1, 0, 0], [0, 1, 0]]
  ])
  const mesh = parseStlMesh(source, 'binary-stl')

  assert.equal(mesh.tag, 'binary-stl')
  assert.deepEqual(mesh.vertices, [[0, 0, 0], [1, 0, 0], [0, 1, 0]])
  assert.deepEqual(mesh.triangles, [[0, 1, 2]])
})

it('parses binary STL ArrayBuffers', () => {
  const source = createBinaryStl([
    [[0, 0, 1], [1, 0, 1], [0, 1, 1]]
  ])
  const mesh = parseStlMesh(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength))

  assert.equal(mesh.tag, 'sol-stl')
  assert.deepEqual(mesh.vertices[2], [0, 1, 1])
})

it('parses ASCII STL sources into renderable meshes', () => {
  const mesh = parseStlMesh(`
    solid part
      facet normal 0 0 1
        outer loop
          vertex 0 0 0
          vertex 1.5 0 0
          vertex 0 1e0 0
        endloop
      endfacet
    endsolid part
  `)

  assert.equal(mesh.tag, 'sol-stl')
  assert.deepEqual(mesh.vertices, [[0, 0, 0], [1.5, 0, 0], [0, 1, 0]])
  assert.deepEqual(mesh.triangles, [[0, 1, 2]])
})

it('returns null for empty or malformed STL source data', () => {
  assert.equal(parseStlMesh('solid empty'), null)
  assert.equal(parseStlMesh(null), null)
  assert.equal(parseStlMesh(new Uint8Array(84)), null)
})

function createBinaryStl (triangles) {
  const bytes = new Uint8Array(84 + triangles.length * 50)
  const view = new DataView(bytes.buffer)

  view.setUint32(80, triangles.length, true)

  triangles.forEach((triangle, triangleIndex) => {
    const offset = 84 + triangleIndex * 50 + 12

    triangle.forEach((vertex, vertexIndex) => {
      const vertexOffset = offset + vertexIndex * 12

      view.setFloat32(vertexOffset, vertex[0], true)
      view.setFloat32(vertexOffset + 4, vertex[1], true)
      view.setFloat32(vertexOffset + 8, vertex[2], true)
    })
  })

  return bytes
}
