import {
  SolidarkRuntime,
  clearGlobalKernel,
  createOpenCascadeKernel,
  useInMemoryKernel
} from '../lib/index.js'

export function showcaseKernelMode (location = globalThis.location) {
  if (!location) {
    return 'memory'
  }

  const search = typeof location === 'string'
    ? new URL(location, 'http://localhost').search
    : location.search
  const mode = new URLSearchParams(search).get('kernel')

  return mode === 'memory' ? 'memory' : 'opencascade'
}

export function createOpenCascadeInitOptions ({
  wasmPath = '/node_modules/opencascade.js/dist/opencascade.wasm.wasm'
} = {}) {
  return {
    locateFile (path) {
      return path.endsWith('.wasm') ? wasmPath : path
    }
  }
}

export function configureShowcaseKernel ({
  kernelFactory = createOpenCascadeKernel,
  location = globalThis.location,
  mode = showcaseKernelMode(location),
  runtime = SolidarkRuntime,
  wasmPath
} = {}) {
  if (mode === 'memory') {
    runtime.configure({ kernel: useInMemoryKernel() })
    return 'memory'
  }

  clearGlobalKernel()
  runtime.configure({
    loader: () => kernelFactory({
      initOptions: createOpenCascadeInitOptions({ wasmPath })
    })
  })
  return 'opencascade'
}
