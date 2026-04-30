import assert from 'node:assert/strict'
import { it } from 'node:test'

import { StlComponent } from './stl.js'

it('defines sol-stl as a mesh file importer', () => {
  assert.equal(StlComponent.tag, 'sol-stl')
  assert.equal(StlComponent.category, 'external')
  assert.equal(StlComponent.geometryKind, 'mesh')
})
