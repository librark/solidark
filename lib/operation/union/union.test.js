import assert from 'node:assert/strict'
import { it } from 'node:test'

import { UnionComponent } from './union.js'

it('defines sol-union as a shape operation', () => {
  assert.equal(UnionComponent.tag, 'sol-union')
  assert.equal(UnionComponent.category, 'operation')
  assert.equal(UnionComponent.geometryKind, 'shape')
  assert.deepEqual(UnionComponent.childGeometryKinds, ['solid', 'surface', 'shape', 'assembly'])
})
