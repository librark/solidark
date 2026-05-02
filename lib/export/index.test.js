import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  GLB_MIME_TYPE,
  STEP_MIME_TYPE,
  STL_MIME_TYPE,
  exportMeshesToGlb,
  exportShapeToStep,
  exportShapeToStl
} from './index.js'

it('exports the GLB and CAD helpers', () => {
  assert.equal(GLB_MIME_TYPE, 'model/gltf-binary')
  assert.equal(STEP_MIME_TYPE, 'model/step')
  assert.equal(STL_MIME_TYPE, 'model/stl')
  assert.equal(typeof exportMeshesToGlb, 'function')
  assert.equal(typeof exportShapeToStep, 'function')
  assert.equal(typeof exportShapeToStl, 'function')
})
