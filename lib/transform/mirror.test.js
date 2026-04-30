import assert from 'node:assert/strict'
import { it } from 'node:test'

import { MirrorComponent } from './mirror.js'

it('defines sol-mirror as a shape transform', () => {
  assert.equal(MirrorComponent.tag, 'sol-mirror')
  assert.equal(MirrorComponent.category, 'transform')
  assert.equal(MirrorComponent.geometryKind, 'shape')
})
