import assert from 'node:assert/strict'
import { it } from 'node:test'

import { StepComponent } from './step.js'

it('defines sol-step as a hierarchy-preserving file importer', () => {
  assert.equal(StepComponent.tag, 'sol-step')
  assert.equal(StepComponent.category, 'external')
  assert.equal(StepComponent.geometryKind, 'assembly')
  assert.deepEqual(StepComponent.defaultProperties, { preserveHierarchy: true })
})
