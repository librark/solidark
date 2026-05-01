import { SolidarkRuntime } from '../lib/runtime/index.js'
import { createViewer } from '../lib/external/viewer/renderer.js'
import './examples/components/enclosure.js'
import './examples/components/lofted-handle.js'
import { configureShowcaseKernel } from './kernel.js'
import { countModelTags, getShowcaseModel, listShowcaseSummaries, loadShowcaseModel } from './models.js'

export { configureShowcaseKernel, createOpenCascadeInitOptions, showcaseKernelMode } from './kernel.js'

export function createShowcaseApp ({
  document,
  modelLoader = loadShowcaseModel,
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
    const summaryModel = getShowcaseModel(id)

    title.textContent = summaryModel.title
    level.textContent = `${summaryModel.level} · ${summaryModel.format}`
    summary.textContent = summaryModel.summary
    details.textContent = 'Evaluating model...'

    let result

    try {
      const model = await modelLoader(id)
      preview.innerHTML = model.markup
      await waitForPreviewUpdate(preview)
      const element = preview.children[0]

      result = typeof viewer.refresh === 'function'
        ? await viewer.refresh(element, { runtime })
        : await renderWithViewer(viewer, runtime, element)
      details.textContent = formatModelDetails(result, countModelTags(model.markup))
      markSelected(list, summaryModel.id)
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
  const entry = document.createElement('div')
  const button = document.createElement('button')
  const link = document.createElement('a')

  entry.className = 'model-entry'
  entry.dataset.modelId = model.id
  button.type = 'button'
  button.dataset.modelId = model.id
  button.innerHTML = `
    <span>${model.title}</span>
    <small>${model.level} · ${model.format}</small>
  `
  link.href = model.source
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.textContent = 'Open standalone'
  button.addEventListener('click', () => selectModel(model.id))
  entry.replaceChildren(button, link)
  return entry
}

async function waitForPreviewUpdate (preview) {
  for (const child of preview.children) {
    if (child.updated && typeof child.updated.then === 'function') {
      await child.updated
    }
  }
}

export function formatModelDetails (result, tagCounts) {
  const lines = [
    `Root: ${result.model.tag}`,
    `Shapes: ${result.shapes.length}`,
    `Meshes: ${result.meshes.length}`,
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

export async function bootShowcase (document = globalThis.document, options = {}) {
  const runtime = options.runtime || SolidarkRuntime

  configureShowcaseKernel({ ...options, runtime })
  const { defineSolidarkElements } = await import('../lib/elements.js')

  defineSolidarkElements()
  const app = createShowcaseApp({ document, modelLoader: options.modelLoader, runtime })
  await app.selectModel('primitives')
  return app
}

/* node:coverage ignore next 3 */
if (globalThis.document) {
  bootShowcase()
}
