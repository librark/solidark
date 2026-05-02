import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseTopologySelector } from './topology-selector.js'

it('parses topology indexes, aliases, and separators', () => {
  assert.deepEqual([...parseTopologySelector('first 2,last;3', 5)], [0, 2, 4, 3])
  assert.deepEqual([...parseTopologySelector([['last'], 0], 4)], [3, 0])
  assert.deepEqual([...parseTopologySelector(2, 4)], [2])
})

it('parses ascending, descending, and negative topology ranges', () => {
  assert.deepEqual([...parseTopologySelector('1..3', 5)], [1, 2, 3])
  assert.deepEqual([...parseTopologySelector('3-1', 5)], [3, 2, 1])
  assert.deepEqual([...parseTopologySelector('-3..-1', 5)], [2, 3, 4])
})

it('ignores invalid and out-of-bounds topology selector tokens', () => {
  assert.deepEqual([...parseTopologySelector('unknown 10 -6 1.5 1..9 9..1', 4)], [])
  assert.deepEqual([...parseTopologySelector('', 4)], [])
  assert.deepEqual([...parseTopologySelector('first last', 0)], [])
})
