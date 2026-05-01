import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ModelComponent } from './model.js'

it('defines the model component metadata', () => {
  assert.equal(ModelComponent.tag, 'sol-model')
  assert.equal(ModelComponent.category, 'structure')
  assert.equal(ModelComponent.geometryKind, 'model')
})
