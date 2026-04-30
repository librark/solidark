import assert from 'node:assert/strict'
import { it } from 'node:test'

import { RevolveComponent } from './revolve.js'

it('defines sol-revolve as a solid feature', () => {
  assert.equal(RevolveComponent.tag, 'sol-revolve')
  assert.equal(RevolveComponent.category, 'feature')
  assert.equal(RevolveComponent.geometryKind, 'solid')
})
