import assert from 'node:assert/strict'
import { it } from 'node:test'

import { TranslateComponent } from './translate.js'

it('defines sol-translate as a shape transform', () => {
  assert.equal(TranslateComponent.tag, 'sol-translate')
  assert.equal(TranslateComponent.category, 'transform')
  assert.equal(TranslateComponent.geometryKind, 'shape')
})
