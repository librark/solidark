import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Kernel } from './contract.js'

const kernelMethods = Object.freeze([
  'cuboid',
  'sphere',
  'cylinder',
  'cone',
  'torus',
  'circle',
  'ellipse',
  'rectangle',
  'polygon',
  'polyline',
  'translate',
  'rotate',
  'scale',
  'mirror',
  'matrix',
  'place',
  'workplane',
  'union',
  'difference',
  'intersection',
  'group',
  'color',
  'fillet',
  'chamfer',
  'shell',
  'offset',
  'extrude',
  'revolve',
  'sweep',
  'loft',
  'section',
  'face',
  'sketch',
  'move',
  'line',
  'arc',
  'close',
  'step',
  'stl',
  'brep'
])

class TestKernel extends Kernel {}

it('provides a library-independent abstract kernel base class', () => {
  const kernel = new TestKernel({ name: 'test-kernel' })
  const shape = kernel.createShape('test', { size: 1 })

  assert.throws(() => new Kernel(), /abstract/)
  assert.equal(kernel.name, 'test-kernel')
  assert.deepEqual(shape, {
    method: 'test',
    properties: { size: 1 },
    children: [],
    disposed: false
  })
})

it('defines every abstract kernel operation directly on Kernel', () => {
  const kernel = new TestKernel()

  for (const method of kernelMethods) {
    assert.equal(typeof kernel[method], 'function')
    assert.throws(
      () => kernel[method](),
      new RegExp(`must implement ${method}\\(\\)`)
    )
  }
})
