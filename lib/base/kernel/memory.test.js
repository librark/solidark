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
  assert.equal(primitive.category, 'primitive')
  assert.equal(sketch.category, 'sketch')
  assert.equal(transform.children[0], primitive)
  assert.equal(operation.children[0], transform)
  assert.equal(feature.children[0], operation)
  assert.equal(external.category, 'external')
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
    [kernel.sphere(), 'primitive', 'sol-sphere'],
    [kernel.cylinder(), 'primitive', 'sol-cylinder'],
    [kernel.cone(), 'primitive', 'sol-cone'],
    [kernel.torus(), 'primitive', 'sol-torus'],
    [kernel.circle(), 'primitive', 'sol-circle'],
    [kernel.rectangle(), 'primitive', 'sol-rectangle'],
    [kernel.polygon(), 'primitive', 'sol-polygon'],
    [kernel.polyline(), 'primitive', 'sol-polyline'],
    [kernel.rotate(), 'transform', 'sol-rotate'],
    [kernel.scale(), 'transform', 'sol-scale'],
    [kernel.mirror(), 'transform', 'sol-mirror'],
    [kernel.matrix(), 'transform', 'sol-matrix'],
    [kernel.place(), 'transform', 'sol-place'],
    [kernel.workplane(), 'transform', 'sol-workplane'],
    [kernel.difference(), 'operation', 'sol-difference'],
    [kernel.intersection(), 'operation', 'sol-intersection'],
    [kernel.group(), 'operation', 'sol-group'],
    [kernel.chamfer(), 'feature', 'sol-chamfer'],
    [kernel.shell(), 'feature', 'sol-shell'],
    [kernel.offset(), 'feature', 'sol-offset'],
    [kernel.extrude(), 'feature', 'sol-extrude'],
    [kernel.revolve(), 'feature', 'sol-revolve'],
    [kernel.sweep(), 'feature', 'sol-sweep'],
    [kernel.loft(), 'feature', 'sol-loft'],
    [kernel.section(), 'feature', 'sol-section'],
    [kernel.face(), 'feature', 'sol-face'],
    [kernel.step(), 'external', 'sol-step'],
    [kernel.brep(), 'external', 'sol-brep']
  ]

  for (const [shape, category, tag] of checks) {
    assert.equal(shape.category, category)
    assert.equal(shape.tag, tag)
  }
})
