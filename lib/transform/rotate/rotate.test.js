import assert from 'node:assert/strict'
import { it } from 'node:test'

import { RotateComponent } from './rotate.js'

it('defines sol-rotate as a shape transform', () => {
  assert.equal(RotateComponent.tag, 'sol-rotate')
  assert.equal(RotateComponent.category, 'transform')
  assert.equal(RotateComponent.geometryKind, 'shape')
})
