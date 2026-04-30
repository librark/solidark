import assert from 'node:assert/strict'
import { it } from 'node:test'

import { defineSolidarkElements } from './elements.js'
import { parseMarkup } from './dom.js'
import { evaluateNode, createDescriptorKernel } from './kernel.js'
import { normalizeElement } from './normalize.js'

defineSolidarkElements()

it('evaluateNode implicitly unions model children', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-cuboid size="1 1 1"></sol-cuboid>
      <sol-sphere radius="2"></sol-sphere>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model))

  assert.equal(shape.tag, 'sol-union')
  assert.equal(shape.properties.implicit, true)
  assert.equal(shape.children.length, 2)
})

it('evaluateNode evaluates transform, operation, feature, and external nodes', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-fillet radius="2">
        <sol-translate by="1 0 0">
          <sol-difference>
            <sol-cuboid size="2 2 2"></sol-cuboid>
            <sol-cylinder radius="1" height="3"></sol-cylinder>
          </sol-difference>
        </sol-translate>
      </sol-fillet>
      <sol-stl src="part.stl"></sol-stl>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model))

  assert.equal(shape.tag, 'sol-union')
  assert.equal(shape.children[0].category, 'feature')
  assert.equal(shape.children[0].children[0].category, 'transform')
  assert.equal(shape.children[1].category, 'external')
})

it('evaluateNode returns no shapes for an empty model and disposes descriptors', () => {
  const [model] = parseMarkup('<sol-model></sol-model>')
  const kernel = createDescriptorKernel()
  const shapes = evaluateNode(normalizeElement(model), kernel)
  const descriptor = kernel.primitive('sol-cuboid', {})

  kernel.dispose(descriptor)

  assert.deepEqual(shapes, [])
  assert.equal(descriptor.disposed, true)
})
