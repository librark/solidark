import assert from 'node:assert/strict'
import { it } from 'node:test'

import { LoftComponent } from './loft.js'

it('defines sol-loft as a solid feature', () => {
  assert.equal(LoftComponent.tag, 'sol-loft')
  assert.equal(LoftComponent.category, 'feature')
  assert.equal(LoftComponent.geometryKind, 'solid')
})
