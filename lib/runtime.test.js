import assert from 'node:assert/strict'
import { it } from 'node:test'

import { defineSolidarkElements } from './elements.js'
import { parseMarkup } from './dom.js'
import { createInMemoryKernel, useInMemoryKernel } from './kernel/index.js'
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

it('Runtime can install an explicit global kernel', async () => {
  const kernel = createInMemoryKernel()
  const runtime = new Runtime({ kernel })

  assert.equal(await runtime.load(), kernel)

  const nextKernel = createInMemoryKernel()
  runtime.configure({ kernel: nextKernel })

  assert.equal(await runtime.load(), nextKernel)
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
  useInMemoryKernel()
  const runtime = new Runtime()
  const [model] = parseMarkup('<sol-model><sol-cuboid size="1 1 1"></sol-cuboid></sol-model>')
  const result = await runtime.evaluate(model)

  assert.equal(result.element, model)
  assert.equal(result.shapes[0].tag, 'sol-cuboid')
  assert.deepEqual(result.meshes, [])
  assert.deepEqual(result.diagnostics, [])

  result.dispose()
  assert.equal(result.shapes[0].disposed, true)
})

it('Runtime includes single mesh output produced by the active kernel', async () => {
  const mesh = { tag: 'sol-cuboid', vertices: [[0, 0, 0]], triangles: [] }
  const kernel = createInMemoryKernel()
  kernel.toMesh = () => mesh
  const runtime = new Runtime({ loader: () => kernel })
  const [model] = parseMarkup('<sol-model><sol-cuboid size="1 1 1"></sol-cuboid></sol-model>')
  const result = await runtime.evaluate(model)

  assert.deepEqual(result.meshes, [mesh])
})

it('Runtime ignores empty mesh output produced by the active kernel', async () => {
  const kernel = createInMemoryKernel()
  kernel.toMesh = () => null
  const runtime = new Runtime({ loader: () => kernel })
  const [model] = parseMarkup('<sol-model><sol-cuboid size="1 1 1"></sol-cuboid></sol-model>')
  const result = await runtime.evaluate(model)

  assert.deepEqual(result.meshes, [])
})

it('Runtime flattens and filters mesh arrays produced by the active kernel', async () => {
  const mesh = { tag: 'sol-cuboid', vertices: [[0, 0, 0]], triangles: [] }
  const kernel = createInMemoryKernel()
  kernel.toMesh = () => [null, mesh, undefined]
  const runtime = new Runtime({ loader: () => kernel })
  const [model] = parseMarkup('<sol-model><sol-cuboid size="1 1 1"></sol-cuboid></sol-model>')
  const result = await runtime.evaluate(model)

  assert.deepEqual(result.meshes, [mesh])
})

it('SolidarkRuntime resetForTests restores descriptor loading', async () => {
  SolidarkRuntime.configure({ loader: () => ({ marker: true, dispose () {} }) })
  assert.deepEqual(await SolidarkRuntime.load(), { marker: true, dispose: (await SolidarkRuntime.load()).dispose })
  SolidarkRuntime.resetForTests()
  assert.equal((await SolidarkRuntime.load()).name, 'in-memory')
})
