import assert from 'node:assert/strict'
import { it } from 'node:test'

import { MoveComponent } from './move.js'

it('defines sol-move as a sketch action', () => {
  assert.equal(MoveComponent.tag, 'sol-move')
  assert.equal(MoveComponent.category, 'component')
  assert.equal(MoveComponent.geometryKind, null)
})
