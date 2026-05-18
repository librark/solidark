import assert from 'node:assert/strict'
import { it } from 'node:test'

const publicEntrypoints = Object.freeze([
  '@librark/solidark',
  '@librark/solidark/component',
  '@librark/solidark/elements',
  '@librark/solidark/export',
  '@librark/solidark/kernel',
  '@librark/solidark/robot',
  '@librark/solidark/runtime',
  '@librark/solidark/viewer'
])

const privateEntrypoints = Object.freeze([
  '@librark/solidark/base',
  '@librark/solidark/base/component',
  '@librark/solidark/primitives',
  '@librark/solidark/primitives/cuboid',
  '@librark/solidark/feature',
  '@librark/solidark/feature/extrude/extrude',
  '@librark/solidark/runtime/kernel/opencascade',
  '@librark/solidark/external/viewer/renderer'
])

it('package exports the supported public entrypoints', async () => {
  const modules = await Promise.all(publicEntrypoints.map((specifier) => import(specifier)))

  assert.equal(typeof modules[0].Component, 'function')
  assert.equal(typeof modules[1].Component, 'function')
  assert.equal(typeof modules[1].html, 'function')
  assert.equal(typeof modules[2].defineSolidarkElements, 'function')
  assert.equal(typeof modules[3].exportResultToStep, 'function')
  assert.equal(typeof modules[4].createOpenCascadeKernel, 'function')
  assert.equal(typeof modules[5].compileRobotDefinition, 'function')
  assert.equal(typeof modules[6].SolidarkRuntime.evaluate, 'function')
  assert.equal(typeof modules[7].createViewer, 'function')
})

it('package keeps internal module paths private', async () => {
  for (const specifier of privateEntrypoints) {
    await assert.rejects(
      import(specifier),
      (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
    )
  }
})
