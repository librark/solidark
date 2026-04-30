import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as kernel from './index.js'

it('exports kernel implementations and helpers', () => {
  assert.equal(typeof kernel.evaluateNode, 'function')
  assert.equal(typeof kernel.createInMemoryKernel, 'function')
  assert.equal(typeof kernel.createDescriptorKernel, 'function')
  assert.equal(typeof kernel.createOpenCascadeKernel, 'function')
  assert.equal(typeof kernel.loadOpenCascade, 'function')
  assert.equal(typeof kernel.loadGlobalKernel, 'function')
  assert.equal(typeof kernel.useInMemoryKernel, 'function')
})
