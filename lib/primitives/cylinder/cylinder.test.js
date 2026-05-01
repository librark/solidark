import assert from 'node:assert/strict'
import { it } from 'node:test'

import { CylinderComponent } from './cylinder.js'

it('defines sol-cylinder as a solid primitive', () => {
  assert.equal(CylinderComponent.tag, 'sol-cylinder')
  assert.equal(CylinderComponent.category, 'primitive')
  assert.equal(CylinderComponent.geometryKind, 'solid')
})
