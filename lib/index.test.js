import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as solidark from './index.js'

it('index exports the public API', () => {
  assert.equal(typeof solidark.Component, 'function')
  assert.equal(typeof solidark.defineSolidarkElements, 'function')
  assert.equal(typeof solidark.SolidarkRuntime.evaluate, 'function')
  assert.equal(typeof solidark.createViewer, 'function')
  assert.equal(typeof solidark.normalizeElement, 'function')
  assert.equal(typeof solidark.evaluateNode, 'function')
})
