import assert from 'node:assert/strict'
import { it } from 'node:test'

import { clearGlobalKernel, getGlobalKernel, loadGlobalKernel, setGlobalKernel, useInMemoryKernel } from './global.js'

it('gets, sets, and clears a global kernel target', () => {
  const target = {}
  const kernel = { name: 'custom' }

  assert.equal(getGlobalKernel(target), undefined)
  assert.equal(setGlobalKernel(kernel, target), kernel)
  assert.equal(getGlobalKernel(target), kernel)
  assert.equal(clearGlobalKernel(target), target)
  assert.equal(getGlobalKernel(target), undefined)
})

it('loads an existing global kernel without replacing it', () => {
  const kernel = { name: 'existing' }
  const target = { kernel }

  assert.equal(loadGlobalKernel({ target, factory: () => ({ name: 'unused' }) }), kernel)
})

it('installs a default kernel when none is present', () => {
  const target = {}
  const kernel = { name: 'default' }

  assert.equal(loadGlobalKernel({ target, factory: () => kernel }), kernel)
  assert.equal(target.kernel, kernel)
})

it('installs the in-memory kernel for tests', () => {
  const target = {}
  const kernel = useInMemoryKernel({ target })

  assert.equal(kernel.name, 'in-memory')
  assert.equal(target.kernel, kernel)
})
