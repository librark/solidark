import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  Viewer,
  collectMeshTriangles,
  collectPrimitiveEntries,
  createMeshSceneSvg,
  createSceneSvg,
  createViewer
} from './viewer.js'

it('createViewer returns a chainable SVG viewer', () => {
  const target = { innerHTML: '', textContent: '' }
  const viewer = createViewer(target)
  const result = {
    shapes: [
      {
        category: 'operation',
        tag: 'sol-union',
        children: [
          { category: 'primitive', tag: 'sol-cuboid', children: [] },
          { category: 'primitive', tag: 'sol-sphere', children: [] }
        ]
      }
    ]
  }

  assert.equal(viewer instanceof Viewer, true)
  assert.equal(viewer.render(result), viewer)
  assert.equal(viewer.result, result)
  assert.match(target.innerHTML, /<svg/)
  assert.match(target.innerHTML, /cuboid/)
  assert.match(target.innerHTML, /sphere/)
  assert.equal(viewer.clear(), viewer)
  assert.equal(viewer.result, null)
  assert.equal(target.innerHTML, '')
  assert.equal(target.textContent, '')
})

it('Viewer works without a target', () => {
  const viewer = new Viewer()
  const result = { shapes: [] }

  viewer.render(result).clear()

  assert.equal(viewer.result, null)
})

it('Viewer falls back to textContent when innerHTML is unavailable', () => {
  const target = { textContent: '' }
  const viewer = new Viewer(target)

  viewer.render({ shapes: [] })

  assert.match(target.textContent, /No geometry/)
  viewer.clear()
  assert.equal(target.textContent, '')
})

it('Viewer renders mesh output when available', () => {
  const target = { innerHTML: '', textContent: '' }
  const viewer = new Viewer(target)
  const result = {
    shapes: [],
    meshes: [
      {
        tag: 'sol-cuboid',
        vertices: [
          [0, 0, 0],
          [2, 0, 0],
          [0, 2, 1]
        ],
        triangles: [[0, 1, 2]]
      }
    ]
  }

  viewer.render(result)

  assert.match(target.innerHTML, /Solidark mesh preview/)
  assert.match(target.innerHTML, /polygon/)
})

it('createSceneSvg renders an empty model state', () => {
  assert.match(createSceneSvg([]), /No geometry/)
  assert.match(createSceneSvg(), /No geometry/)
})

it('createMeshSceneSvg renders an empty mesh state', () => {
  assert.match(createMeshSceneSvg([]), /No geometry/)
  assert.match(createMeshSceneSvg(), /No geometry/)
})

it('collectPrimitiveEntries walks descriptor children recursively', () => {
  const primitive = { category: 'primitive', tag: 'sol-cylinder', children: [] }
  const result = collectPrimitiveEntries([
    { category: 'primitive', tag: 'sol-sphere' },
    {
      category: 'operation',
      tag: 'sol-difference',
      children: [
        primitive,
        {
          category: 'transform',
          tag: 'sol-translate',
          children: [
            { category: 'primitive', tag: 'sol-cuboid', children: [] }
          ]
        }
      ]
    }
  ])

  assert.deepEqual(result.map((shape) => shape.tag), ['sol-sphere', 'sol-cylinder', 'sol-cuboid'])
})

it('collectMeshTriangles projects and sorts mesh triangles', () => {
  const result = collectMeshTriangles([
    {
      tag: 'sol-cuboid',
      vertices: [
        [0, 0, 0],
        [4, 0, 0],
        [0, 4, 1],
        [8, 8, 8]
      ],
      triangles: [
        [3, 2, 1],
        [0, 1, 2]
      ]
    }
  ])

  assert.equal(result.length, 2)
  assert.deepEqual(result[0].vertices[0], [0, 0, 0])
  assert.deepEqual(result[0].projected[0], [0, 0])
  assert.equal(result[1].meshIndex, 0)
})
