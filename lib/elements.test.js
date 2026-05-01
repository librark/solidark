import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  CuboidComponent,
  LineComponent,
  ModelComponent,
  MoveComponent,
  StepComponent,
  StlComponent,
  ViewerComponent,
  builtInElements,
  defineSolidarkElements
} from './elements.js'
import { createElement, getDefinedElement } from './dom.js'

it('builtInElements includes core model, primitive, and import elements', () => {
  assert.equal(builtInElements.includes(ModelComponent), true)
  assert.equal(builtInElements.includes(CuboidComponent), true)
  assert.equal(builtInElements.includes(StepComponent), true)
  assert.equal(builtInElements.includes(StlComponent), true)
  assert.equal(builtInElements.includes(ViewerComponent), true)
})

it('component imports register built-ins', () => {
  const defined = defineSolidarkElements()
  const cuboid = createElement('sol-cuboid')
  const step = createElement('sol-step')
  const viewer = createElement('sol-viewer')

  assert.equal(defined, builtInElements)
  assert.equal(getDefinedElement('sol-model'), ModelComponent)
  assert.equal(getDefinedElement('sol-move'), MoveComponent)
  assert.equal(getDefinedElement('sol-line'), LineComponent)
  assert.equal(getDefinedElement('sol-viewer'), ViewerComponent)
  assert.equal(cuboid instanceof CuboidComponent, true)
  assert.equal(step.properties.preserveHierarchy, true)
  assert.equal(viewer instanceof ViewerComponent, true)
})
