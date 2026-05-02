import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ScaleComponent } from './scale.js'

it('defines sol-scale as a shape transform', () => {
  assert.equal(ScaleComponent.tag, 'sol-scale')
  assert.equal(ScaleComponent.category, 'transform')
  assert.equal(ScaleComponent.geometryKind, 'shape')
  assert.deepEqual(ScaleComponent.childGeometryKinds, ['geometry'])
})
