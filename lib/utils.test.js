import assert from 'node:assert/strict'
import { it } from 'node:test'

import { camelCase, parseAttributeValue, parseVector, stableStringify } from './utils.js'

it('camelCase converts dash-case names', () => {
  assert.equal(camelCase('major-radius'), 'majorRadius')
  assert.equal(camelCase('radius'), 'radius')
})

it('parseVector accepts arrays, objects, spaces, and commas', () => {
  assert.deepEqual(parseVector([1, '2', 3]), [1, 2, 3])
  assert.deepEqual(parseVector({ x: 1, y: 2 }), [1, 2])
  assert.deepEqual(parseVector('1 2 3'), [1, 2, 3])
  assert.deepEqual(parseVector('1,2,3'), [1, 2, 3])
})

it('parseAttributeValue parses booleans, numbers, vectors, and strings', () => {
  assert.equal(parseAttributeValue(''), true)
  assert.equal(parseAttributeValue('12.5'), 12.5)
  assert.deepEqual(parseAttributeValue('1 2 3'), [1, 2, 3])
  assert.equal(parseAttributeValue('steel'), 'steel')
})

it('stableStringify sorts object keys recursively', () => {
  assert.equal(
    stableStringify({ b: 2, a: [{ d: 4, c: 3 }] }),
    '{"a":[{"c":3,"d":4}],"b":2}'
  )
})
