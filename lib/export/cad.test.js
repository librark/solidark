import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  BREP_MIME_TYPE,
  STEP_MIME_TYPE,
  STL_MIME_TYPE,
  exportShapeToBrep,
  exportShapeToStep,
  exportShapeToStl
} from './cad.js'

it('exports CAD MIME type constants', () => {
  assert.equal(BREP_MIME_TYPE, 'model/vnd.opencascade.brep')
  assert.equal(STEP_MIME_TYPE, 'model/step')
  assert.equal(STL_MIME_TYPE, 'model/stl')
})

it('delegates STEP and STL export to the provided kernel', () => {
  const entry = { value: 'shape' }
  const calls = []
  const kernel = {
    toStep (shape, options) {
      calls.push(['step', shape, options])
      return 'STEP'
    },
    toStl (shape, options) {
      calls.push(['stl', shape, options])
      return 'STL'
    },
    toBrep (shape, options) {
      calls.push(['brep', shape, options])
      return 'BREP'
    }
  }

  assert.equal(exportShapeToStep(entry, { kernel }), 'STEP')
  assert.equal(exportShapeToStl(entry, { kernel }), 'STL')
  assert.equal(exportShapeToBrep(entry, { kernel }), 'BREP')
  assert.deepEqual(calls.map(([type, shape]) => [type, shape]), [
    ['step', entry],
    ['stl', entry],
    ['brep', entry]
  ])
})

it('delegates CAD export to the global kernel when no kernel is passed', () => {
  const previous = globalThis.kernel

  try {
    globalThis.kernel = {
      toStep () {
        return 'GLOBAL STEP'
      }
    }

    assert.equal(exportShapeToStep({}), 'GLOBAL STEP')
  } finally {
    globalThis.kernel = previous
  }
})

it('rejects missing CAD export kernel support', () => {
  assert.throws(
    () => exportShapeToStep({}, { kernel: {} }),
    /toStep/
  )
  assert.throws(
    () => exportShapeToStl({}, { kernel: null }),
    /toStl/
  )
  assert.throws(
    () => exportShapeToBrep({}, { kernel: {} }),
    /toBrep/
  )
})
