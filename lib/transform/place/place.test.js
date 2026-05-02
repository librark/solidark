import assert from 'node:assert/strict'
import { it } from 'node:test'

import { PlaceComponent } from './place.js'

it('defines sol-place as a shape transform', () => {
  assert.equal(PlaceComponent.tag, 'sol-place')
  assert.equal(PlaceComponent.category, 'transform')
  assert.equal(PlaceComponent.geometryKind, 'shape')
  assert.deepEqual(PlaceComponent.childGeometryKinds, ['geometry'])
})
