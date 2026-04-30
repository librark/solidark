import assert from 'node:assert/strict'
import { it } from 'node:test'

import { defineSolidarkElements } from '../elements.js'
import { parseMarkup } from '../dom.js'
import { evaluateNode } from './evaluate.js'
import { createInMemoryKernel } from './in-memory.js'
import { normalizeElement } from '../normalize.js'

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

it('evaluateNode evaluates sketches and sketch actions explicitly', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-loft>
        <sol-sketch>
          <sol-move point="0 0"></sol-move>
          <sol-line point="1 0"></sol-line>
          <sol-close></sol-close>
        </sol-sketch>
      </sol-loft>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model))

  assert.equal(shape.tag, 'sol-loft')
  assert.equal(shape.children[0].tag, 'sol-sketch')
  assert.equal(shape.children[0].category, 'sketch')
  assert.deepEqual(shape.children[0].children.map((child) => child.category), ['sketch', 'sketch', 'sketch'])
  assert.deepEqual(shape.children[0].children.map((child) => child.tag), ['sol-move', 'sol-line', 'sol-close'])
})

it('evaluateNode returns no shapes for an empty model', () => {
  const [model] = parseMarkup('<sol-model></sol-model>')

  assert.deepEqual(evaluateNode(normalizeElement(model), createInMemoryKernel()), [])
})

it('evaluateNode passes through unsupported component nodes', () => {
  assert.deepEqual(
    evaluateNode({
      tag: 'custom-wrapper',
      category: 'component',
      geometryKind: null,
      properties: {},
      implicitUnion: false,
      children: []
    }),
    []
  )
})
