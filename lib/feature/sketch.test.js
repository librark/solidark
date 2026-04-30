import assert from 'node:assert/strict'
import { it } from 'node:test'

import { SketchComponent } from './sketch.js'

it('defines sol-sketch as a sketch component', () => {
  assert.equal(SketchComponent.tag, 'sol-sketch')
  assert.equal(SketchComponent.category, 'component')
  assert.equal(SketchComponent.geometryKind, 'sketch')
})
