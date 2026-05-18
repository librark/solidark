import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  SOLIDARK_CDN_BASE_URL,
  SOLIDARK_DEFAULT_OPENCASCADE_VERSION,
  SOLIDARK_DEFAULT_THREE_VERSION,
  bootSolidarkCdn,
  cdnPackageUrl,
  configureCdnKernel,
  createOpenCascadeCdnInitOptions,
  loadCdnThree
} from './cdn.js'

it('builds default CDN URLs for package assets', () => {
  assert.equal(SOLIDARK_CDN_BASE_URL, 'https://unpkg.com')
  assert.equal(SOLIDARK_DEFAULT_OPENCASCADE_VERSION, '1.1.1')
  assert.equal(SOLIDARK_DEFAULT_THREE_VERSION, '0.172.0')
  assert.equal(
    cdnPackageUrl('three', '0.172.0', '/build/three.module.js'),
    'https://unpkg.com/three@0.172.0/build/three.module.js'
  )
  assert.equal(cdnPackageUrl('@librark/solidark', '0.1.0'), 'https://unpkg.com/@librark/solidark@0.1.0')
})

it('loads Three.js from a CDN once and stores it on the target', async () => {
  const target = {}
  const three = { Scene: class Scene {} }
  const imports = []
  const importer = async (specifier) => {
    imports.push(specifier)
    return three
  }

  assert.equal(await loadCdnThree({ importer, target, threeUrl: 'https://cdn.example/three.js' }), three)
  assert.equal(await loadCdnThree({ importer, target, threeUrl: 'https://cdn.example/three.js' }), three)
  assert.equal(await loadCdnThree({ importer, loadThree: false, target }), null)
  assert.deepEqual(imports, ['https://cdn.example/three.js'])
  assert.equal(target.SolidarkThree, three)
})

it('configures a runtime with an OpenCascade CDN loader', async () => {
  const configured = []
  const imports = []
  const runtime = {
    configure (options) {
      configured.push(options)
      return this
    }
  }
  const openCascade = {}
  const importer = async (specifier) => {
    imports.push(specifier)
    return {
      initOpenCascade (options) {
        assert.equal(options.locateFile('opencascade.wasm.wasm'), 'https://cdn.example/opencascade.wasm.wasm')
        assert.equal(options.locateFile('other.data'), 'other.data')
        return openCascade
      }
    }
  }

  assert.equal(configureCdnKernel({
    importer,
    openCascadeModuleUrl: 'https://cdn.example/opencascade.wasm.js',
    openCascadeWasmUrl: 'https://cdn.example/opencascade.wasm.wasm',
    runtime
  }), runtime)

  const kernel = await configured[0].loader()

  assert.equal(kernel.openCascade, openCascade)
  assert.deepEqual(imports, ['https://cdn.example/opencascade.wasm.js'])
})

it('lets OpenCascade init options override the default locateFile hook', () => {
  const options = createOpenCascadeCdnInitOptions({
    initOptions: {
      locateFile (path) {
        return `custom:${path}`
      }
    },
    openCascadeWasmUrl: 'https://cdn.example/opencascade.wasm.wasm'
  })

  assert.equal(options.locateFile('opencascade.wasm.wasm'), 'custom:opencascade.wasm.wasm')
})

it('can configure the in-memory kernel for CDN demos and tests', () => {
  const target = {}
  const configured = []
  const runtime = {
    configure (options) {
      configured.push(options)
      return this
    }
  }

  assert.equal(configureCdnKernel({ kernel: 'memory', runtime, target }), runtime)
  assert.equal(configured[0].kernel.name, 'in-memory')
  assert.equal(target.kernel, configured[0].kernel)
})

it('boots the CDN runtime, optional Three.js module, and element definitions', async () => {
  const target = {}
  const three = { Scene: class Scene {} }
  const elements = [class ElementA {}]
  const runtime = {
    configured: [],
    configure (options) {
      this.configured.push(options)
      return this
    }
  }
  const result = await bootSolidarkCdn({
    elementsImporter: async () => ({
      defineSolidarkElements () {
        return elements
      }
    }),
    importer: async () => three,
    openCascadeModuleUrl: 'https://cdn.example/opencascade.wasm.js',
    openCascadeWasmUrl: 'https://cdn.example/opencascade.wasm.wasm',
    runtime,
    target
  })

  assert.equal(result.SolidarkRuntime, runtime)
  assert.equal(result.elements, elements)
  assert.equal(result.mode, 'opencascade')
  assert.equal(result.three, three)
  assert.equal(target.SolidarkThree, three)
  assert.equal(typeof result.Component, 'function')
  assert.equal(typeof result.html, 'function')
  assert.equal(typeof result.defineSolidarkElements, 'function')
  assert.equal(typeof runtime.configured[0].loader, 'function')
})

it('can boot without defining elements or loading Three.js', async () => {
  const runtime = {
    configured: [],
    configure (options) {
      this.configured.push(options)
      return this
    }
  }
  const result = await bootSolidarkCdn({
    defineElements: false,
    kernel: 'memory',
    loadThree: false,
    runtime,
    target: {}
  })

  assert.deepEqual(result.elements, [])
  assert.equal(result.defineSolidarkElements, undefined)
  assert.equal(result.mode, 'memory')
  assert.equal(result.three, null)
  assert.equal(runtime.configured[0].kernel.name, 'in-memory')
})

it('boots default Solidark elements after runtime configuration', async () => {
  const runtime = {
    configured: [],
    configure (options) {
      this.configured.push(options)
      return this
    }
  }
  const result = await bootSolidarkCdn({
    kernel: 'memory',
    loadThree: false,
    runtime,
    target: {}
  })

  assert.ok(result.elements.length > 0)
  assert.equal(result.elements.some((element) => element.tag === 'sol-model'), true)
  assert.equal(result.elements.some((element) => element.tag === 'sol-viewer'), true)
  assert.equal(runtime.configured[0].kernel.name, 'in-memory')
})
