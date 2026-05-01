import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ConeComponent } from './cone.js'

it('defines sol-cone as a solid primitive', () => {
  assert.equal(ConeComponent.tag, 'sol-cone')
  assert.equal(ConeComponent.category, 'primitive')
  assert.equal(ConeComponent.geometryKind, 'solid')
})
