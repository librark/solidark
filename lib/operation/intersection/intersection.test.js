import assert from 'node:assert/strict'
import { it } from 'node:test'

import { IntersectionComponent } from './intersection.js'

it('defines sol-intersection as a shape operation', () => {
  assert.equal(IntersectionComponent.tag, 'sol-intersection')
  assert.equal(IntersectionComponent.category, 'operation')
  assert.equal(IntersectionComponent.geometryKind, 'shape')
  assert.deepEqual(IntersectionComponent.childGeometryKinds, ['solid', 'surface', 'shape', 'assembly'])
})
