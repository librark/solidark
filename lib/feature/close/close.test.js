import assert from 'node:assert/strict'
import { it } from 'node:test'

import { CloseComponent } from './close.js'

it('defines sol-close as a sketch action', () => {
  assert.equal(CloseComponent.tag, 'sol-close')
  assert.equal(CloseComponent.category, 'sketch')
  assert.equal(CloseComponent.geometryKind, null)
})
