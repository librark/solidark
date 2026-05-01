import assert from 'node:assert/strict'
import { it } from 'node:test'

import { PolylineComponent } from './polyline.js'

it('defines sol-polyline as a sketch primitive', () => {
  assert.equal(PolylineComponent.tag, 'sol-polyline')
  assert.equal(PolylineComponent.category, 'primitive')
  assert.equal(PolylineComponent.geometryKind, 'sketch')
})
