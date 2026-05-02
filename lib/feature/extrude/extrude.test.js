import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ExtrudeComponent } from './extrude.js'

it('defines sol-extrude as a solid feature', () => {
  assert.equal(ExtrudeComponent.tag, 'sol-extrude')
  assert.equal(ExtrudeComponent.category, 'feature')
  assert.equal(ExtrudeComponent.geometryKind, 'solid')
  assert.deepEqual(ExtrudeComponent.childGeometryKinds, ['sketch', 'surface'])
})
