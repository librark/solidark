import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Kernel } from './contract.js'
import { MemoryKernel, createDescriptorKernel, createInMemoryKernel } from './memory.js'

it('creates in-memory descriptor shapes', () => {
  const kernel = createInMemoryKernel()
  const primitive = kernel.cuboid({ size: [1, 1, 1] })
  const sketch = kernel.sketch({}, [
    kernel.move({ point: [0, 0] }),
    kernel.line({ point: [1, 0] }),
    kernel.close()
  ])
  const transform = kernel.translate({ by: [1, 0, 0] }, [primitive])
  const operation = kernel.union({}, [transform])
  const feature = kernel.fillet({ radius: 1 }, [operation, sketch])
  const external = kernel.stl({ src: 'part.stl' })

  assert.equal(kernel instanceof Kernel, true)
  assert.equal(kernel instanceof MemoryKernel, true)
  assert.equal(kernel.name, 'in-memory')
  assert.equal(primitive.method, 'cuboid')
  assert.equal(sketch.method, 'sketch')
  assert.equal(transform.children[0], primitive)
  assert.equal(operation.children[0], transform)
  assert.equal(feature.children[0], operation)
  assert.equal(external.method, 'stl')
  assert.equal(kernel.toMesh(primitive), null)

  kernel.dispose(primitive)
  assert.equal(primitive.disposed, true)
})

it('keeps createDescriptorKernel as an alias for the in-memory kernel', () => {
  assert.equal(createDescriptorKernel, createInMemoryKernel)
})

it('implements every explicit kernel method', () => {
  const kernel = createInMemoryKernel()
  const checks = [
    [kernel.sphere(), 'sphere'],
    [kernel.cylinder(), 'cylinder'],
    [kernel.cone(), 'cone'],
    [kernel.torus(), 'torus'],
    [kernel.circle(), 'circle'],
    [kernel.rectangle(), 'rectangle'],
    [kernel.polygon(), 'polygon'],
    [kernel.polyline(), 'polyline'],
    [kernel.rotate(), 'rotate'],
    [kernel.scale(), 'scale'],
    [kernel.mirror(), 'mirror'],
    [kernel.matrix(), 'matrix'],
    [kernel.place(), 'place'],
    [kernel.workplane(), 'workplane'],
    [kernel.difference(), 'difference'],
    [kernel.intersection(), 'intersection'],
    [kernel.group(), 'group'],
    [kernel.chamfer(), 'chamfer'],
    [kernel.shell(), 'shell'],
    [kernel.offset(), 'offset'],
    [kernel.extrude(), 'extrude'],
    [kernel.revolve(), 'revolve'],
    [kernel.sweep(), 'sweep'],
    [kernel.loft(), 'loft'],
    [kernel.section(), 'section'],
    [kernel.face(), 'face'],
    [kernel.step(), 'step'],
    [kernel.brep(), 'brep']
  ]

  for (const [shape, method] of checks) {
    assert.equal(shape.method, method)
  }
})
