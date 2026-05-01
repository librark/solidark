import assert from 'node:assert/strict'
import { it } from 'node:test'

import { loadGlobalKernel, useInMemoryKernel } from './global.js'

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
