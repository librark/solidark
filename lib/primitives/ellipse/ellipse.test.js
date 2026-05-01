import assert from 'node:assert/strict'
import { it } from 'node:test'

import { EllipseComponent } from './ellipse.js'

it('defines sol-ellipse as a sketch primitive', () => {
  assert.equal(EllipseComponent.tag, 'sol-ellipse')
  assert.equal(EllipseComponent.category, 'primitive')
  assert.equal(EllipseComponent.geometryKind, 'sketch')
})
