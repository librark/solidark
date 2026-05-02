import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  BREP_MIME_TYPE,
  GLB_MIME_TYPE,
  STEP_MIME_TYPE,
  STL_MIME_TYPE,
  createCadExportBlob,
  downloadResultToStep,
  exportMeshesToGlb,
  exportResultToStep,
  exportShapeToBrep,
  exportShapeToStep,
  exportShapeToStl
} from './index.js'

it('exports the GLB and CAD helpers', () => {
  assert.equal(GLB_MIME_TYPE, 'model/gltf-binary')
  assert.equal(BREP_MIME_TYPE, 'model/vnd.opencascade.brep')
  assert.equal(STEP_MIME_TYPE, 'model/step')
  assert.equal(STL_MIME_TYPE, 'model/stl')
  assert.equal(typeof createCadExportBlob, 'function')
  assert.equal(typeof downloadResultToStep, 'function')
  assert.equal(typeof exportMeshesToGlb, 'function')
  assert.equal(typeof exportResultToStep, 'function')
  assert.equal(typeof exportShapeToBrep, 'function')
  assert.equal(typeof exportShapeToStep, 'function')
  assert.equal(typeof exportShapeToStl, 'function')
})
