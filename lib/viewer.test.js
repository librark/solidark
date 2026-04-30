import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Viewer, createViewer } from './viewer.js'

it('createViewer returns a chainable viewer', () => {
  const target = { textContent: '' }
  const viewer = createViewer(target)
  const result = { shapes: [{ tag: 'sol-cuboid' }] }

  assert.equal(viewer instanceof Viewer, true)
  assert.equal(viewer.render(result), viewer)
  assert.equal(viewer.result, result)
  assert.equal(target.textContent, '{"shapes":1,"tags":["sol-cuboid"]}')
  assert.equal(viewer.clear(), viewer)
  assert.equal(viewer.result, null)
  assert.equal(target.textContent, '')
})

it('Viewer works without a target', () => {
  const viewer = new Viewer()
  const result = { shapes: [] }

  viewer.render(result).clear()

  assert.equal(viewer.result, null)
})
