import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  Component,
  SolidarkChildGeometryError,
  html,
  parseAttributeValue,
  parseVector
} from './component.js'

it('exports component authoring helpers', () => {
  assert.equal(typeof Component, 'function')
  assert.equal(typeof SolidarkChildGeometryError, 'function')
  assert.equal(typeof html, 'function')
  assert.equal(typeof parseAttributeValue, 'function')
  assert.equal(typeof parseVector, 'function')
})
