import assert from 'node:assert/strict'
import { it } from 'node:test'

import { createInMemoryKernel } from '../../base/index.js'
import { ColorComponent } from './color.js'

it('defines sol-color as a styling component', () => {
  assert.equal(ColorComponent.tag, 'sol-color')
  assert.equal(ColorComponent.category, 'styling')
  assert.equal(ColorComponent.geometryKind, null)
})

it('maps value and colour aliases to color metadata', () => {
  const kernel = createInMemoryKernel()
  const valueShape = ColorComponent.createKernelShape({ value: '#336699' }, [], kernel)
  const colorShape = ColorComponent.createKernelShape({ color: 'blue' }, [], kernel)
  const colourShape = ColorComponent.createKernelShape({ colour: 'tomato' }, [], kernel)

  assert.equal(valueShape.method, 'color')
  assert.equal(valueShape.properties.color, '#336699')
  assert.equal(valueShape.styling.color, '#336699')
  assert.equal(colorShape.properties.color, 'blue')
  assert.equal(colorShape.styling.color, 'blue')
  assert.equal(colourShape.properties.color, 'tomato')
  assert.equal(colourShape.styling.color, 'tomato')
})

it('evaluates as a transparent styling wrapper', () => {
  const children = [
    null,
    'passthrough',
    {
      tag: 'sol-cuboid',
      properties: {},
      children: []
    },
    {
      tag: 'sol-sphere',
      properties: {},
      children: [],
      styling: { color: 'blue' }
    }
  ]
  const result = ColorComponent.evaluateNode({ properties: { value: '#336699' } }, children)

  assert.equal(result[0], null)
  assert.equal(result[1], 'passthrough')
  assert.notEqual(result[2], children[2])
  assert.deepEqual(result.slice(2).map((shape) => shape.tag), ['sol-cuboid', 'sol-sphere'])
  assert.deepEqual(result[2].styling, { color: '#336699' })
  assert.deepEqual(result[3].styling, { color: 'blue' })
  assert.equal(ColorComponent.evaluateNode({ properties: {} }, children), children)
  assert.equal(ColorComponent.evaluateNode({}, children), children)
})
