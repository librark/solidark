import assert from 'node:assert/strict'
import { it } from 'node:test'

import { FaceComponent } from './face.js'

it('defines sol-face as a surface feature', () => {
  assert.equal(FaceComponent.tag, 'sol-face')
  assert.equal(FaceComponent.category, 'feature')
  assert.equal(FaceComponent.geometryKind, 'surface')
})
