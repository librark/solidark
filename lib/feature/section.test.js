import assert from 'node:assert/strict'
import { it } from 'node:test'

import { SectionComponent } from './section.js'

it('defines sol-section as a sketch feature', () => {
  assert.equal(SectionComponent.tag, 'sol-section')
  assert.equal(SectionComponent.category, 'feature')
  assert.equal(SectionComponent.geometryKind, 'sketch')
})
