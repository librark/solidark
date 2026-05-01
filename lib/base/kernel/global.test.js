import assert from 'node:assert/strict'
import { it } from 'node:test'

import { clearGlobalKernel, getGlobalKernel, setGlobalKernel } from './global.js'

it('gets, sets, and clears a global kernel target', () => {
  const target = {}
  const kernel = { name: 'custom' }

  assert.equal(getGlobalKernel(target), undefined)
  assert.equal(setGlobalKernel(kernel, target), kernel)
  assert.equal(getGlobalKernel(target), kernel)
  assert.equal(clearGlobalKernel(target), target)
  assert.equal(getGlobalKernel(target), undefined)
})
