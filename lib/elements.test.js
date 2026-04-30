import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  CuboidComponent,
  LineComponent,
  ModelComponent,
  MoveComponent,
  StepComponent,
  StlComponent,
  builtInElements,
  defineSolidarkElements
} from './elements.js'
import { createElement, getDefinedElement } from './dom.js'

it('builtInElements includes core model, primitive, and import elements', () => {
  assert.equal(builtInElements.includes(ModelComponent), true)
  assert.equal(builtInElements.includes(CuboidComponent), true)
  assert.equal(builtInElements.includes(StepComponent), true)
  assert.equal(builtInElements.includes(StlComponent), true)
})

it('defineSolidarkElements registers all built-ins', () => {
  const defined = defineSolidarkElements()
  const cuboid = createElement('sol-cuboid')
  const step = createElement('sol-step')

  assert.equal(defined, builtInElements)
  assert.equal(getDefinedElement('sol-model'), ModelComponent)
  assert.equal(getDefinedElement('sol-move'), MoveComponent)
  assert.equal(getDefinedElement('sol-line'), LineComponent)
  assert.equal(cuboid instanceof CuboidComponent, true)
  assert.equal(step.properties.preserveHierarchy, true)
})
