import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as transform from './index.js'

it('exports transform components', () => {
  assert.equal(transform.TranslateComponent.tag, 'sol-translate')
  assert.equal(transform.RotateComponent.tag, 'sol-rotate')
  assert.equal(transform.ScaleComponent.tag, 'sol-scale')
  assert.equal(transform.MirrorComponent.tag, 'sol-mirror')
  assert.equal(transform.MatrixComponent.tag, 'sol-matrix')
  assert.equal(transform.PlaceComponent.tag, 'sol-place')
  assert.equal(transform.WorkplaneComponent.tag, 'sol-workplane')
})
