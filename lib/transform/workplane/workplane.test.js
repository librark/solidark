import assert from 'node:assert/strict'
import { it } from 'node:test'

import { WorkplaneComponent } from './workplane.js'

it('defines sol-workplane as a shape transform', () => {
  assert.equal(WorkplaneComponent.tag, 'sol-workplane')
  assert.equal(WorkplaneComponent.category, 'transform')
  assert.equal(WorkplaneComponent.geometryKind, 'shape')
  assert.deepEqual(WorkplaneComponent.childGeometryKinds, ['geometry'])
})
