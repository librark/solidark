import assert from 'node:assert/strict'
import { it } from 'node:test'

import { FilletComponent } from './fillet.js'

it('defines sol-fillet as a solid feature', () => {
  assert.equal(FilletComponent.tag, 'sol-fillet')
  assert.equal(FilletComponent.category, 'feature')
  assert.equal(FilletComponent.geometryKind, 'solid')
})
