import assert from 'node:assert/strict'
import { it } from 'node:test'

import { SketchComponent } from './sketch.js'

it('defines sol-sketch as a sketch container', () => {
  assert.equal(SketchComponent.tag, 'sol-sketch')
  assert.equal(SketchComponent.category, 'sketch')
  assert.equal(SketchComponent.geometryKind, 'sketch')
})
