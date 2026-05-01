import assert from 'node:assert/strict'
import { it } from 'node:test'

import { SphereComponent } from './sphere.js'

it('defines sol-sphere as a solid primitive', () => {
  assert.equal(SphereComponent.tag, 'sol-sphere')
  assert.equal(SphereComponent.category, 'primitive')
  assert.equal(SphereComponent.geometryKind, 'solid')
})
