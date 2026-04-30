import assert from 'node:assert/strict'
import { it } from 'node:test'

import { createOpenCascadeKernel, loadOpenCascade } from './opencascade.js'

it('loads OpenCascade.js through the stable initOpenCascade entrypoint', async () => {
  const initOptions = { wasmBinaryFile: 'opencascade.wasm' }
  const openCascade = { ready: true }
  const loaded = await loadOpenCascade({
    initOptions,
    async importer (specifier) {
      assert.equal(specifier, 'opencascade.js')
      return {
        async initOpenCascade (receivedOptions) {
          assert.equal(receivedOptions, initOptions)
          return openCascade
        }
      }
    }
  })

  assert.equal(loaded, openCascade)
})

it('rejects modules without initOpenCascade', async () => {
  await assert.rejects(
    () => loadOpenCascade({
      async importer () {
        return {}
      }
    }),
    /initOpenCascade/
  )
})

it('creates a kernel adapter with the loaded OpenCascade module attached', async () => {
  const openCascade = { module: 'occt' }
  const kernel = await createOpenCascadeKernel({
    async importer () {
      return {
        async initOpenCascade () {
          return openCascade
        }
      }
    }
  })

  assert.equal(kernel.name, 'opencascade')
  assert.equal(kernel.openCascade, openCascade)
  assert.equal(kernel.cuboid({}).tag, 'sol-cuboid')
})
