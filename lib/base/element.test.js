import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Component } from './component.js'
import { createElementClass } from './element.js'

it('creates Solidark element classes with static metadata', () => {
  const PartComponent = createElementClass('test-part', 'primitive', 'solid', { centered: true })

  assert.equal(PartComponent.prototype instanceof Component, true)
  assert.equal(PartComponent.tag, 'test-part')
  assert.equal(PartComponent.category, 'primitive')
  assert.equal(PartComponent.geometryKind, 'solid')
  assert.deepEqual(PartComponent.defaultProperties, { centered: true })
})

it('uses empty default properties when omitted', () => {
  assert.deepEqual(createElementClass('test-empty', 'component', null).defaultProperties, {})
})
