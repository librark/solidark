import assert from 'node:assert/strict'
import { it } from 'node:test'

import { SweepComponent } from './sweep.js'

it('defines sol-sweep as a solid feature', () => {
  assert.equal(SweepComponent.tag, 'sol-sweep')
  assert.equal(SweepComponent.category, 'feature')
  assert.equal(SweepComponent.geometryKind, 'solid')
  assert.deepEqual(SweepComponent.childGeometryKinds, ['sketch', 'surface'])
})
