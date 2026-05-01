import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  GLB_MIME_TYPE,
  createGlbBlob,
  createGlbObjectUrl,
  exportMeshesToGlb
} from './glb.js'

it('exports renderable meshes as a binary glTF asset', () => {
  const parsed = parseGlb(exportMeshesToGlb([
    {
      tag: 'sol-cuboid',
      vertices: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [4]
      ],
      triangles: [[0, 1, 2]]
    },
    {
      vertices: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 0]
      ],
      triangles: [[0, 1, 2]]
    }
  ], { generator: 'solidark-test' }))

  assert.equal(parsed.header.magic, 0x46546c67)
  assert.equal(parsed.header.version, 2)
  assert.equal(parsed.json.asset.generator, 'solidark-test')
  assert.equal(parsed.json.asset.version, '2.0')
  assert.equal(parsed.json.scenes[0].nodes.length, 2)
  assert.equal(parsed.json.meshes[0].name, 'sol-cuboid')
  assert.equal(parsed.json.meshes[1].name, 'mesh-1')
  assert.equal(parsed.json.nodes[1].name, 'node-1')
  assert.equal(parsed.json.meshes[0].primitives[0].mode, 4)
  assert.equal(parsed.json.meshes[0].primitives[0].attributes.POSITION, 0)
  assert.equal(parsed.json.meshes[0].primitives[0].attributes.NORMAL, 1)
  assert.equal(parsed.json.meshes[0].primitives[0].indices, 2)
  assert.equal(parsed.json.materials[0].doubleSided, true)
  assert.equal(parsed.json.materials[0].pbrMetallicRoughness.baseColorFactor.length, 4)
  assert.equal(parsed.json.buffers[0].byteLength, parsed.binary.byteLength)

  const positionAccessor = parsed.json.accessors[0]
  const normalAccessor = parsed.json.accessors[1]
  const indexAccessor = parsed.json.accessors[2]

  assert.deepEqual(positionAccessor.min, [0, 0, 0])
  assert.deepEqual(positionAccessor.max, [4, 1, 0])
  assert.equal(positionAccessor.count, 4)
  assert.equal(normalAccessor.count, 4)
  assert.equal(indexAccessor.componentType, 5125)
  assert.deepEqual(indexAccessor.min, [0])
  assert.deepEqual(indexAccessor.max, [3])
  assert.deepEqual(readFloatAccessor(parsed, normalAccessor), [
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 0
  ])
  assert.deepEqual(readUintAccessor(parsed, indexAccessor), [0, 1, 2])
})

it('exports an empty GLB when meshes do not contain triangles', () => {
  const parsed = parseGlb(exportMeshesToGlb([
    {
      vertices: [],
      triangles: []
    }
  ]))

  assert.equal(parsed.json.asset.generator, 'solidark')
  assert.equal(parsed.json.meshes.length, 0)
  assert.equal(parsed.json.nodes.length, 0)
  assert.equal(parsed.json.buffers[0].byteLength, 0)
})

it('exports mesh styling colors as GLB material factors', () => {
  const parsed = parseGlb(exportMeshesToGlb([
    coloredMesh('#369c'),
    coloredMesh('#336699cc'),
    coloredMesh('#369'),
    coloredMesh('#336699'),
    coloredMesh('tomato'),
    coloredMesh('rgba(10, 20, 30, 0.5)'),
    coloredMesh('rgb(10, 20, 30)'),
    coloredMesh('0.1 0.2 0.3'),
    coloredMesh([255, 128, 0, 128]),
    coloredMesh([0.1, 0.2, 0.3]),
    coloredMesh([300, -10, 128, 999]),
    coloredMesh([0, 0, 0]),
    stylingMesh('blue'),
    nullColorStylingMesh('yellow'),
    coloredMesh('not-a-color'),
    coloredMesh({ invalid: true }),
    coloredMesh('')
  ]))
  const colors = parsed.json.materials.map((material) => material.pbrMetallicRoughness.baseColorFactor)

  assert.deepEqual(colors[0], [0.2, 0.4, 0.6, 0.8])
  assert.deepEqual(colors[1], [0.2, 0.4, 0.6, 0.8])
  assert.deepEqual(colors[2], [0.2, 0.4, 0.6, 1])
  assert.deepEqual(colors[3], [0.2, 0.4, 0.6, 1])
  assert.deepEqual(colors[4], [1, 0.38823529411764707, 0.2784313725490196, 1])
  assert.deepEqual(colors[5], [10 / 255, 20 / 255, 30 / 255, 0.5])
  assert.deepEqual(colors[6], [10 / 255, 20 / 255, 30 / 255, 1])
  assert.deepEqual(colors[7], [0.1, 0.2, 0.3, 1])
  assert.deepEqual(colors[8], [1, 128 / 255, 0, 128 / 255])
  assert.deepEqual(colors[9], [0.1, 0.2, 0.3, 1])
  assert.deepEqual(colors[10], [1, 0, 128 / 255, 1])
  assert.deepEqual(colors[11], [0, 0, 0, 1])
  assert.deepEqual(colors[12], [0, 0, 1, 1])
  assert.deepEqual(colors[13], [1, 1, 0, 1])
  assert.deepEqual(colors[14], [0.63, 0.58, 0.86, 1])
  assert.deepEqual(colors[15], [0.78, 0.62, 0.38, 1])
  assert.deepEqual(colors[16], [0.48, 0.72, 0.42, 1])
})

it('creates GLB blobs and object URLs', () => {
  const mesh = {
    tag: 'sol-triangle',
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0]
    ],
    triangles: [[0, 1, 2]]
  }
  const blob = createGlbBlob([mesh])
  const calls = []
  const created = createGlbObjectUrl([mesh], {}, {
    createObjectURL (blob) {
      calls.push(blob)
      return 'blob:solidark-glb'
    }
  })

  assert.equal(blob.type, GLB_MIME_TYPE)
  assert.equal(created.url, 'blob:solidark-glb')
  assert.equal(created.blob.type, GLB_MIME_TYPE)
  assert.equal(calls[0], created.blob)
  assert.throws(
    () => createGlbObjectUrl([], {}, {}),
    /URL\.createObjectURL/
  )
})

function coloredMesh (color) {
  return {
    color,
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0]
    ],
    triangles: [[0, 1, 2]]
  }
}

function stylingMesh (color) {
  const mesh = coloredMesh(undefined)

  delete mesh.color
  mesh.styling = { color }
  return mesh
}

function nullColorStylingMesh (color) {
  const mesh = coloredMesh(null)

  mesh.styling = { color }
  return mesh
}

function parseGlb (glb) {
  const view = new DataView(glb)
  const jsonLength = view.getUint32(12, true)
  const jsonOffset = 20
  const binHeaderOffset = jsonOffset + jsonLength
  const binLength = view.getUint32(binHeaderOffset, true)
  const binOffset = binHeaderOffset + 8
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, jsonOffset, jsonLength)).trim())

  assert.equal(view.getUint32(16, true), 0x4e4f534a)
  assert.equal(view.getUint32(binHeaderOffset + 4, true), 0x004e4942)
  assert.equal(view.getUint32(8, true), glb.byteLength)

  return {
    header: {
      magic: view.getUint32(0, true),
      version: view.getUint32(4, true),
      length: view.getUint32(8, true)
    },
    json,
    binary: new Uint8Array(glb, binOffset, binLength)
  }
}

function readFloatAccessor (parsed, accessor) {
  const view = parsed.json.bufferViews[accessor.bufferView]

  return Array.from(new Float32Array(
    parsed.binary.buffer,
    parsed.binary.byteOffset + view.byteOffset,
    view.byteLength / 4
  ))
}

function readUintAccessor (parsed, accessor) {
  const view = parsed.json.bufferViews[accessor.bufferView]

  return Array.from(new Uint32Array(
    parsed.binary.buffer,
    parsed.binary.byteOffset + view.byteOffset,
    view.byteLength / 4
  ))
}
