import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as base from './index.js'

it('exports base component helpers', () => {
  assert.equal(typeof base.Component, 'function')
  assert.equal(typeof base.createElementClass, 'function')
  assert.equal(base.ModelComponent.tag, 'sol-model')
})
