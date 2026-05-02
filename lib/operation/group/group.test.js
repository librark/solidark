import assert from 'node:assert/strict'
import { it } from 'node:test'

import { GroupComponent } from './group.js'

it('defines sol-group as a shape operation', () => {
  assert.equal(GroupComponent.tag, 'sol-group')
  assert.equal(GroupComponent.category, 'operation')
  assert.equal(GroupComponent.geometryKind, 'shape')
  assert.deepEqual(GroupComponent.childGeometryKinds, ['geometry'])
})
