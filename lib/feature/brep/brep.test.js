import assert from 'node:assert/strict'
import { it } from 'node:test'

import { BrepComponent } from './brep.js'

it('defines sol-brep as a kernel-native file importer', () => {
  assert.equal(BrepComponent.tag, 'sol-brep')
  assert.equal(BrepComponent.category, 'external')
  assert.equal(BrepComponent.geometryKind, 'shape')
})
