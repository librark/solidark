import assert from 'node:assert/strict'
import { it } from 'node:test'

import { CuboidComponent } from './cuboid.js'

it('defines sol-cuboid as a solid primitive', () => {
  assert.equal(CuboidComponent.tag, 'sol-cuboid')
  assert.equal(CuboidComponent.category, 'primitive')
  assert.equal(CuboidComponent.geometryKind, 'solid')
})
