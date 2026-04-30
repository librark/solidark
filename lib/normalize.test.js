import assert from 'node:assert/strict'
import { it } from 'node:test'

import { defineSolidarkElements } from './elements.js'
import { parseMarkup } from './dom.js'
import { normalizeElement, producesGeometry } from './normalize.js'

defineSolidarkElements()

it('normalizeElement creates an inspectable tree', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-cuboid size="1 2 3"></sol-cuboid>
      <sol-sphere radius="2"></sol-sphere>
    </sol-model>
  `)
  const normalized = normalizeElement(model)

  assert.equal(normalized.tag, 'sol-model')
  assert.equal(normalized.category, 'model')
  assert.equal(normalized.implicitUnion, true)
  assert.deepEqual(normalized.children[0].properties.size, [1, 2, 3])
  assert.equal(producesGeometry(normalized), true)
})

it('normalizeElement handles non-geometry components', () => {
  const [element] = parseMarkup('<plain-node></plain-node>')
  const normalized = normalizeElement(element)

  assert.equal(normalized.category, 'component')
  assert.equal(normalized.geometryKind, null)
  assert.equal(normalized.implicitUnion, false)
  assert.equal(producesGeometry(normalized), false)
})

it('normalizeElement falls back to tagName and inherited geometry', () => {
  const normalized = normalizeElement({
    tagName: 'SOL-GROUP',
    constructor: {},
    children: [
      {
        localName: 'sol-cuboid',
        constructor: { category: 'primitive', geometryKind: 'solid' },
        children: [],
        properties: {}
      }
    ],
    properties: {}
  })

  assert.equal(normalized.tag, 'sol-group')
  assert.equal(producesGeometry(normalized), true)
})

it('normalizeElement handles missing children and properties', () => {
  const normalized = normalizeElement({
    localName: 'sol-model',
    constructor: { category: 'model', geometryKind: 'model' }
  })

  assert.equal(normalized.implicitUnion, false)
  assert.deepEqual(normalized.properties, {})
  assert.equal(producesGeometry({ geometryKind: 'solid', children: [] }), true)
})
