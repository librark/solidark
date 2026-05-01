import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as base from './index.js'

it('exports base component helpers', () => {
  assert.equal(typeof base.Component, 'function')
  assert.equal(typeof base.createElementClass, 'function')
  assert.equal(typeof base.html, 'function')
  assert.equal(typeof base.camelCase, 'function')
  assert.equal(typeof base.parseAttributeValue, 'function')
  assert.equal(typeof base.parseVector, 'function')
  assert.equal(typeof base.stableStringify, 'function')
  assert.equal('ModelComponent' in base, false)
})
