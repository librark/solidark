import assert from 'node:assert/strict'
import { it } from 'node:test'

import { CircleComponent } from './circle.js'

it('defines sol-circle as a sketch primitive', () => {
  assert.equal(CircleComponent.tag, 'sol-circle')
  assert.equal(CircleComponent.category, 'primitive')
  assert.equal(CircleComponent.geometryKind, 'sketch')
})
