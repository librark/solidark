import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ChamferComponent } from './chamfer.js'

it('defines sol-chamfer as a solid feature', () => {
  assert.equal(ChamferComponent.tag, 'sol-chamfer')
  assert.equal(ChamferComponent.category, 'feature')
  assert.equal(ChamferComponent.geometryKind, 'solid')
})
