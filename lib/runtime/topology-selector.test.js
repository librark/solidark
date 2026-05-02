import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseTopologyNames, parseTopologySelector, resolveTopologySelector } from './topology-selector.js'

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

it('parses named topology selector declarations', () => {
  assert.deepEqual(
    parseTopologyNames('rounded:edge:0..3 lid:face:last face:bottom:first bad'),
    {
      edges: { rounded: '0..3' },
      faces: { lid: 'last', bottom: 'first' }
    }
  )
  assert.deepEqual(
    parseTopologyNames({ edges: { rounded: '0..3' }, faces: { lid: 'last' }, ignored: true }),
    {
      edges: { rounded: '0..3' },
      faces: { lid: 'last' }
    }
  )
  assert.equal(parseTopologyNames(''), null)
  assert.equal(parseTopologyNames({}), null)
})

it('resolves named topology selectors', () => {
  assert.deepEqual(
    [...resolveTopologySelector('rounded last', 6, { rounded: '1..3', allCaps: 'first' })],
    [1, 2, 3, 5]
  )
  assert.deepEqual(
    [...resolveTopologySelector('loop', 6, { loop: 'first tail', tail: '-2..-1' })],
    [0, 4, 5]
  )
})
