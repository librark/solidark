import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as operation from './index.js'

it('exports operation components', () => {
  assert.equal(operation.UnionComponent.tag, 'sol-union')
  assert.equal(operation.DifferenceComponent.tag, 'sol-difference')
  assert.equal(operation.IntersectionComponent.tag, 'sol-intersection')
  assert.equal(operation.GroupComponent.tag, 'sol-group')
})
