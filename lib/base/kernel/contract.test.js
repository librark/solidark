import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  Kernel,
  kernelCategoryByMethod,
  kernelMethodByTag,
  kernelMethodDefinitions,
  kernelMethodForTag,
  kernelTagByMethod,
  requireKernelMethod
} from './contract.js'

class TestKernel extends Kernel {}

it('provides an abstract kernel base class', () => {
  const kernel = new TestKernel({ name: 'test-kernel' })
  const shape = kernel.createShape('primitive', 'sol-test', { size: 1 })

  assert.throws(() => new Kernel(), /abstract/)
  assert.equal(kernel.name, 'test-kernel')
  assert.deepEqual(shape, {
    category: 'primitive',
    tag: 'sol-test',
    properties: { size: 1 },
    children: [],
    disposed: false
  })
})

it('defines the explicit kernel method contract', () => {
  assert.equal(kernelMethodDefinitions.length, 37)
  assert.equal(kernelMethodByTag['sol-cuboid'], 'cuboid')
  assert.equal(kernelMethodByTag['sol-translate'], 'translate')
  assert.equal(kernelMethodByTag['sol-union'], 'union')
  assert.equal(kernelMethodByTag['sol-fillet'], 'fillet')
  assert.equal(kernelMethodByTag['sol-sketch'], 'sketch')
  assert.equal(kernelMethodByTag['sol-stl'], 'stl')
  assert.equal(kernelCategoryByMethod.cuboid, 'primitive')
  assert.equal(kernelCategoryByMethod.translate, 'transform')
  assert.equal(kernelCategoryByMethod.union, 'operation')
  assert.equal(kernelCategoryByMethod.fillet, 'feature')
  assert.equal(kernelCategoryByMethod.sketch, 'sketch')
  assert.equal(kernelCategoryByMethod.move, 'sketch')
  assert.equal(kernelCategoryByMethod.line, 'sketch')
  assert.equal(kernelCategoryByMethod.close, 'sketch')
  assert.equal(kernelCategoryByMethod.stl, 'external')
  assert.equal(kernelTagByMethod.cuboid, 'sol-cuboid')
})

it('returns kernel methods by Solidark tag', () => {
  const kernel = {
    cuboid (properties, children) {
      return { properties, children }
    }
  }
  const compile = requireKernelMethod(kernel, 'sol-cuboid')

  assert.equal(kernelMethodForTag('sol-cuboid'), 'cuboid')
  assert.equal(kernelMethodForTag('missing-tag'), null)
  assert.deepEqual(compile.call(kernel, { size: 1 }, []), { properties: { size: 1 }, children: [] })
  assert.equal(requireKernelMethod(kernel, 'missing-tag'), null)
})

it('throws when a kernel misses a required method', () => {
  assert.throws(
    () => requireKernelMethod({}, 'sol-cuboid'),
    /cuboid\(\)/
  )
})
