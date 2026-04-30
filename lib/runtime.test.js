import assert from 'node:assert/strict'
import { it } from 'node:test'

import { defineSolidarkElements } from './elements.js'
import { parseMarkup } from './dom.js'
import { Runtime, SolidarkRuntime } from './runtime.js'

defineSolidarkElements()

it('Runtime loads a kernel once and can be configured', async () => {
  const runtime = new Runtime()
  let calls = 0
  const kernel = { dispose () {} }

  runtime.configure({
    loader () {
      calls += 1
      return kernel
    }
  })

  assert.equal(await runtime.load(), kernel)
  assert.equal(await runtime.load(), kernel)
  assert.equal(calls, 1)
  assert.equal(runtime.configure(), runtime)
})

it('Runtime schedules microtasks and macro-tasks', async () => {
  const runtime = new Runtime()

  assert.equal(await runtime.schedule(() => 'micro'), 'micro')
  assert.equal(await runtime.schedule(() => 'macro', { macro: true }), 'macro')
})

it('Runtime flush handles elements without children', async () => {
  const runtime = new Runtime()
  const element = {
    rendered: Promise.resolve('rendered'),
    updated: Promise.resolve('updated')
  }

  assert.equal(await runtime.flush(element), element)
})

it('Runtime evaluates and disposes a model', async () => {
  const runtime = new Runtime()
  const [model] = parseMarkup('<sol-model><sol-cuboid size="1 1 1"></sol-cuboid></sol-model>')
  const result = await runtime.evaluate(model)

  assert.equal(result.element, model)
  assert.equal(result.shapes[0].tag, 'sol-cuboid')
  assert.deepEqual(result.diagnostics, [])

  result.dispose()
  assert.equal(result.shapes[0].disposed, true)
})

it('SolidarkRuntime resetForTests restores descriptor loading', async () => {
  SolidarkRuntime.configure({ loader: () => ({ marker: true, dispose () {} }) })
  assert.deepEqual(await SolidarkRuntime.load(), { marker: true, dispose: (await SolidarkRuntime.load()).dispose })
  SolidarkRuntime.resetForTests()
  assert.equal(typeof (await SolidarkRuntime.load()).primitive, 'function')
})
