import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ArcComponent } from './arc.js'

it('defines sol-arc as a sketch action', () => {
  assert.equal(ArcComponent.tag, 'sol-arc')
  assert.equal(ArcComponent.category, 'sketch')
  assert.equal(ArcComponent.geometryKind, null)
})
