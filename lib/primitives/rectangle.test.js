import assert from 'node:assert/strict'
import { it } from 'node:test'

import { RectangleComponent } from './rectangle.js'

it('defines sol-rectangle as a sketch primitive', () => {
  assert.equal(RectangleComponent.tag, 'sol-rectangle')
  assert.equal(RectangleComponent.category, 'primitive')
  assert.equal(RectangleComponent.geometryKind, 'sketch')
})
