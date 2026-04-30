import assert from 'node:assert/strict'
import { it } from 'node:test'

import { OffsetComponent } from './offset.js'

it('defines sol-offset as a shape feature', () => {
  assert.equal(OffsetComponent.tag, 'sol-offset')
  assert.equal(OffsetComponent.category, 'feature')
  assert.equal(OffsetComponent.geometryKind, 'shape')
})
