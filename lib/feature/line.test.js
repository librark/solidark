import assert from 'node:assert/strict'
import { it } from 'node:test'

import { LineComponent } from './line.js'

it('defines sol-line as a sketch action', () => {
  assert.equal(LineComponent.tag, 'sol-line')
  assert.equal(LineComponent.category, 'component')
  assert.equal(LineComponent.geometryKind, null)
})
