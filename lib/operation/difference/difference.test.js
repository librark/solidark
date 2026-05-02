import assert from 'node:assert/strict'
import { it } from 'node:test'

import { DifferenceComponent } from './difference.js'

it('defines sol-difference as a shape operation', () => {
  assert.equal(DifferenceComponent.tag, 'sol-difference')
  assert.equal(DifferenceComponent.category, 'operation')
  assert.equal(DifferenceComponent.geometryKind, 'shape')
  assert.deepEqual(DifferenceComponent.childGeometryKinds, ['solid', 'surface', 'shape', 'assembly'])
})
