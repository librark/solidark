import assert from 'node:assert/strict'
import { it } from 'node:test'

import { TorusComponent } from './torus.js'

it('defines sol-torus as a solid primitive', () => {
  assert.equal(TorusComponent.tag, 'sol-torus')
  assert.equal(TorusComponent.category, 'primitive')
  assert.equal(TorusComponent.geometryKind, 'solid')
})
