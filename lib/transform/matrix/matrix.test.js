import assert from 'node:assert/strict'
import { it } from 'node:test'

import { MatrixComponent } from './matrix.js'

it('defines sol-matrix as a shape transform', () => {
  assert.equal(MatrixComponent.tag, 'sol-matrix')
  assert.equal(MatrixComponent.category, 'transform')
  assert.equal(MatrixComponent.geometryKind, 'shape')
  assert.equal(MatrixComponent.shapeGeometryKind, 'child')
  assert.deepEqual(MatrixComponent.childGeometryKinds, ['geometry'])
})
