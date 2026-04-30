import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Viewer, collectPrimitiveEntries, createSceneSvg, createViewer } from './viewer.js'

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

it('createSceneSvg renders an empty model state', () => {
  assert.match(createSceneSvg([]), /No geometry/)
  assert.match(createSceneSvg(), /No geometry/)
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
