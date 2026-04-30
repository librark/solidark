import assert from 'node:assert/strict'
import { it } from 'node:test'

import { PolygonComponent } from './polygon.js'

it('defines sol-polygon as a sketch primitive', () => {
  assert.equal(PolygonComponent.tag, 'sol-polygon')
  assert.equal(PolygonComponent.category, 'primitive')
  assert.equal(PolygonComponent.geometryKind, 'sketch')
})
