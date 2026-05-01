import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as kernel from './index.js'

it('exports the base kernel contract and global accessors', () => {
  assert.equal(typeof kernel.Kernel, 'function')
  assert.equal(typeof kernel.MemoryKernel, 'function')
  assert.equal(typeof kernel.createInMemoryKernel, 'function')
  assert.equal(typeof kernel.getGlobalKernel, 'function')
  assert.equal(typeof kernel.setGlobalKernel, 'function')
  assert.equal(typeof kernel.clearGlobalKernel, 'function')
  assert.equal('loadGlobalKernel' in kernel, false)
})
