import {
  SolidarkRuntime,
  clearGlobalKernel,
  createOpenCascadeKernel,
  createViewer,
  defineSolidarkElements,
  useInMemoryKernel
} from '../lib/index.js'
import { countModelTags, getShowcaseModel, listShowcaseSummaries } from './models.js'

export function createShowcaseApp ({
  document,
  runtime = SolidarkRuntime,
  viewerFactory = createViewer
}) {
  const list = document.querySelector('[data-model-list]')
  const preview = document.querySelector('[data-preview]')
  const title = document.querySelector('[data-title]')
  const level = document.querySelector('[data-level]')
  const summary = document.querySelector('[data-summary]')
  const details = document.querySelector('[data-details]')
  const viewerTarget = document.querySelector('[data-viewer]')
  const viewer = typeof viewerTarget.refresh === 'function'
    ? viewerTarget
    : viewerFactory(viewerTarget)

  async function selectModel (id) {
    const model = getShowcaseModel(id)

    title.textContent = model.title
    level.textContent = model.level
    summary.textContent = model.summary
    preview.innerHTML = model.markup
    details.textContent = 'Evaluating model...'

    const element = preview.children[0]
    let result

    try {
      result = typeof viewer.refresh === 'function'
        ? await viewer.refresh(element, { runtime })
        : await renderWithViewer(viewer, runtime, element)
      details.textContent = formatModelDetails(result, countModelTags(model.markup))
      markSelected(list, model.id)
    } catch (error) {
      clearViewer(viewer)
      details.textContent = formatEvaluationError(error)
      throw error
    }

    return result
  }

  list.replaceChildren(...listShowcaseSummaries().map((model) => createModelButton(document, model, selectModel)))

  return {
    selectModel,
    models: listShowcaseSummaries(),
    viewer
  }
}

async function renderWithViewer (viewer, runtime, element) {
  const result = await runtime.evaluate(element)

  viewer.render(result)
  return result
}

function clearViewer (viewer) {
  if (typeof viewer.clear === 'function') {
    viewer.clear()
  }
}

export function createModelButton (document, model, selectModel) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.modelId = model.id
  button.innerHTML = `
    <span>${model.title}</span>
    <small>${model.level}</small>
  `
  button.addEventListener('click', () => selectModel(model.id))
  return button
}

export function formatModelDetails (result, tagCounts) {
  const lines = [
    `Root: ${result.model.tag}`,
    `Shapes: ${result.shapes.length}`,
    `Meshes: ${result.meshes?.length || 0}`,
    `Implicit union: ${result.model.implicitUnion ? 'yes' : 'no'}`
  ]

  for (const [tag, count] of Object.entries(tagCounts).sort()) {
    lines.push(`${tag}: ${count}`)
  }

  return lines.join('\n')
}

export function formatEvaluationError (error) {
  const message = error instanceof Error ? error.message : String(error)

  return `Evaluation failed: ${message}`
}

export function markSelected (list, id) {
  for (const child of list.children) {
    child.toggleAttribute('aria-current', child.dataset.modelId === id)
  }
}

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

export async function bootShowcase (document = globalThis.document, options = {}) {
  const runtime = options.runtime || SolidarkRuntime

  defineSolidarkElements()
  configureShowcaseKernel({ ...options, runtime })
  const app = createShowcaseApp({ document, runtime })
  await app.selectModel('primitives')
  return app
}

/* node:coverage ignore next 3 */
if (globalThis.document) {
  bootShowcase()
}
