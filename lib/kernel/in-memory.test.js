import assert from 'node:assert/strict'
import { it } from 'node:test'

import { createDescriptorKernel, createInMemoryKernel } from './in-memory.js'

it('creates in-memory descriptor shapes', () => {
  const kernel = createInMemoryKernel()
  const primitive = kernel.primitive('sol-cuboid', { size: [1, 1, 1] })
  const transform = kernel.transform('sol-translate', { by: [1, 0, 0] }, [primitive])
  const operation = kernel.operation('sol-union', {}, [transform])
  const feature = kernel.feature('sol-fillet', { radius: 1 }, [operation])
  const external = kernel.external('sol-stl', { src: 'part.stl' })

  assert.equal(kernel.name, 'in-memory')
  assert.equal(primitive.category, 'primitive')
  assert.equal(transform.children[0], primitive)
  assert.equal(operation.children[0], transform)
  assert.equal(feature.children[0], operation)
  assert.equal(external.category, 'external')

  kernel.dispose(primitive)
  assert.equal(primitive.disposed, true)
})

it('keeps createDescriptorKernel as an alias for the in-memory kernel', () => {
  assert.equal(createDescriptorKernel, createInMemoryKernel)
})
