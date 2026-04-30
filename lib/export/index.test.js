import assert from 'node:assert/strict'
import { it } from 'node:test'

import { GLB_MIME_TYPE, exportMeshesToGlb } from './index.js'

it('exports the GLB helpers', () => {
  assert.equal(GLB_MIME_TYPE, 'model/gltf-binary')
  assert.equal(typeof exportMeshesToGlb, 'function')
})
