import { Component, html } from './component.js'
import { SolidarkRuntime } from './runtime/index.js'
import {
  createOpenCascadeKernel,
  useInMemoryKernel
} from './runtime/kernel/index.js'

export const SOLIDARK_CDN_BASE_URL = 'https://unpkg.com'
export const SOLIDARK_DEFAULT_OPENCASCADE_VERSION = '1.1.1'
export const SOLIDARK_DEFAULT_THREE_VERSION = '0.172.0'

export {
  Component,
  SolidarkRuntime,
  html
}

export async function bootSolidarkCdn ({
  defineElements = true,
  elementsImporter = importSolidarkElements,
  importer = importCdnModule,
  kernel = 'opencascade',
  loadThree = true,
  openCascadeModuleUrl = cdnPackageUrl('opencascade.js', SOLIDARK_DEFAULT_OPENCASCADE_VERSION, 'dist/opencascade.wasm.js'),
  openCascadeWasmUrl = cdnPackageUrl('opencascade.js', SOLIDARK_DEFAULT_OPENCASCADE_VERSION, 'dist/opencascade.wasm.wasm'),
  runtime = SolidarkRuntime,
  target = globalThis,
  threeGlobal = 'SolidarkThree',
  threeUrl = cdnPackageUrl('three', SOLIDARK_DEFAULT_THREE_VERSION, 'build/three.module.js'),
  initOptions
} = {}) {
  const three = await loadCdnThree({ importer, loadThree, target, threeGlobal, threeUrl })

  configureCdnKernel({
    importer,
    initOptions,
    kernel,
    openCascadeModuleUrl,
    openCascadeWasmUrl,
    runtime,
    target
  })

  const elements = defineElements ? await elementsImporter() : null
  const definedElements = elements?.defineSolidarkElements?.() || []

  return {
    Component,
    SolidarkRuntime: runtime,
    defineSolidarkElements: elements?.defineSolidarkElements,
    elements: definedElements,
    html,
    mode: kernel,
    three
  }
}

export function configureCdnKernel ({
  importer = importCdnModule,
  initOptions,
  kernel = 'opencascade',
  openCascadeModuleUrl = cdnPackageUrl('opencascade.js', SOLIDARK_DEFAULT_OPENCASCADE_VERSION, 'dist/opencascade.wasm.js'),
  openCascadeWasmUrl = cdnPackageUrl('opencascade.js', SOLIDARK_DEFAULT_OPENCASCADE_VERSION, 'dist/opencascade.wasm.wasm'),
  runtime = SolidarkRuntime,
  target = globalThis
} = {}) {
  if (kernel === 'memory') {
    runtime.configure({ kernel: useInMemoryKernel({ target }) })
    return runtime
  }

  runtime.configure({
    loader: () => createOpenCascadeKernel({
      importer: () => importer(openCascadeModuleUrl),
      initOptions: createOpenCascadeCdnInitOptions({ initOptions, openCascadeWasmUrl })
    })
  })

  return runtime
}

export function createOpenCascadeCdnInitOptions ({
  initOptions = {},
  openCascadeWasmUrl = cdnPackageUrl('opencascade.js', SOLIDARK_DEFAULT_OPENCASCADE_VERSION, 'dist/opencascade.wasm.wasm')
} = {}) {
  return {
    locateFile (path) {
      return path.endsWith('.wasm') ? openCascadeWasmUrl : path
    },
    ...initOptions
  }
}

export async function loadCdnThree ({
  importer = importCdnModule,
  loadThree = true,
  target = globalThis,
  threeGlobal = 'SolidarkThree',
  threeUrl = cdnPackageUrl('three', SOLIDARK_DEFAULT_THREE_VERSION, 'build/three.module.js')
} = {}) {
  if (!loadThree) {
    return null
  }

  if (target[threeGlobal]) {
    return target[threeGlobal]
  }

  const three = await importer(threeUrl)
  target[threeGlobal] = three
  return three
}

export function cdnPackageUrl (name, version, path = '') {
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : ''

  return `${SOLIDARK_CDN_BASE_URL}/${name}@${version}${suffix}`
}

async function importSolidarkElements () {
  return import('./elements.js')
}

/* node:coverage ignore next 3 */
async function importCdnModule (url) {
  return import(url)
}
