import { SolidarkRuntime } from '../lib/runtime/index.js'
import { createViewer } from '../lib/external/viewer/renderer.js'
import {
  downloadResultToBrep,
  downloadResultToStep,
  downloadResultToStl
} from '../lib/export/index.js'
import './examples/components/enclosure.js'
import './examples/components/lofted-handle.js'
import { configureShowcaseKernel } from './kernel.js'
import { countModelTags, getShowcaseModel, listShowcaseSummaries, loadShowcaseModel } from './models.js'

export { configureShowcaseKernel, createOpenCascadeInitOptions, showcaseKernelMode } from './kernel.js'

const HTML_ESCAPES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})

export function createShowcaseApp ({
  document,
  downloaders = {
    brep: downloadResultToBrep,
    step: downloadResultToStep,
    stl: downloadResultToStl
  },
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
  const sourceCode = document.querySelector('[data-source-code]')
  const sourcePath = document.querySelector('[data-source-path]')
  const viewerTarget = document.querySelector('[data-viewer]')
  const exportButtons = {
    brep: document.querySelector('[data-export-brep]'),
    step: document.querySelector('[data-export-step]'),
    stl: document.querySelector('[data-export-stl]')
  }
  const viewer = typeof viewerTarget.refresh === 'function'
    ? viewerTarget
    : viewerFactory(viewerTarget)
  const selection = {
    model: null,
    result: null
  }

  setupExportButtons(exportButtons, selection, downloaders)
  setExportButtonsEnabled(exportButtons, false)

  async function selectModel (id) {
    const summaryModel = getShowcaseModel(id)

    title.textContent = summaryModel.title
    level.textContent = `${summaryModel.level} · ${summaryModel.format}`
    summary.textContent = summaryModel.summary
    details.textContent = 'Evaluating model...'
    sourcePath.textContent = summaryModel.source
    sourceCode.innerHTML = ''
    selection.model = summaryModel
    selection.result = null
    setExportButtonsEnabled(exportButtons, false)

    let result

    try {
      const model = await modelLoader(id)
      preview.innerHTML = model.markup
      await waitForPreviewUpdate(preview)
      const element = preview.children[0]

      sourceCode.innerHTML = highlightMarkup(sourceMarkupForModel(summaryModel, model, element))
      result = typeof viewer.refresh === 'function'
        ? await viewer.refresh(element, { runtime })
        : await renderWithViewer(viewer, runtime, element)
      selection.result = result
      details.textContent = formatModelDetails(result, countModelTags(model.markup))
      markSelected(list, summaryModel.id)
      setExportButtonsEnabled(exportButtons, true)
    } catch (error) {
      selection.result = null
      setExportButtonsEnabled(exportButtons, false)
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

function setupExportButtons (buttons, selection, downloaders) {
  for (const [format, button] of Object.entries(buttons)) {
    if (!button || typeof button.addEventListener !== 'function') {
      continue
    }

    button.addEventListener('click', () => {
      if (!selection.result) {
        return
      }

      downloaders[format](selection.result, {
        filename: exportFilename(selection.model, format)
      })
    })
  }
}

function setExportButtonsEnabled (buttons, enabled) {
  for (const button of Object.values(buttons)) {
    if (button) {
      button.disabled = !enabled
    }
  }
}

export function exportFilename (model, extension) {
  const name = String(model?.id || 'solidark-model')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'solidark-model'

  return `${name}.${extension}`
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
  const [diagnostic] = Array.isArray(error?.diagnostics) ? error.diagnostics : []

  if (diagnostic) {
    const lines = [
      `Evaluation failed: ${diagnostic.cause}`,
      `Component: ${diagnostic.path}`,
      `Kernel method: ${diagnostic.method}`,
      `Stage: ${diagnostic.stage}`
    ]

    if (diagnostic.errorCategory) {
      lines.push(`Error category: ${diagnostic.errorCategory}`)
    }

    if (diagnostic.suggestion) {
      lines.push(`Suggestion: ${diagnostic.suggestion}`)
    }

    return lines.join('\n')
  }

  return `Evaluation failed: ${message}`
}

export function highlightMarkup (markup) {
  return escapeHtml(formatMarkup(markup)).replace(
    /(&lt;\/?)([a-z][\w-]*)([\s\S]*?)(&gt;)/gi,
    (match, opening, tag, attributes, closing) => [
      `<span class="source-token-tag">${opening}</span>`,
      `<span class="source-token-name">${tag}</span>`,
      highlightAttributes(attributes),
      `<span class="source-token-tag">${closing}</span>`
    ].join('')
  )
}

export function formatMarkup (markup) {
  const tokens = String(markup).trim().match(/<\/?[^>]+>|[^<]+/g) || []
  const lines = []
  let depth = 0

  for (const token of tokens) {
    const text = token.trim()

    if (!text) {
      continue
    }

    if (isClosingTag(text)) {
      depth = Math.max(depth - 1, 0)
    }

    lines.push(`${'  '.repeat(depth)}${text}`)

    if (isOpeningTag(text)) {
      depth += 1
    }
  }

  return lines.join('\n')
}

export function sourceMarkupForModel (summaryModel, model, element) {
  const renderedMarkup = element && typeof element.innerHTML === 'string'
    ? element.innerHTML.trim()
    : ''

  return summaryModel.format === 'Component' && renderedMarkup
    ? renderedMarkup
    : model.markup
}

function highlightAttributes (attributes) {
  return attributes.replace(
    /(\s+)([\w:-]+)(?:=(&quot;.*?&quot;|&#39;.*?&#39;|[^\s]+))?/g,
    (match, spacing, name, value) => {
      if (value === undefined) {
        return `${spacing}<span class="source-token-attribute">${name}</span>`
      }

      return `${spacing}<span class="source-token-attribute">${name}</span>=<span class="source-token-value">${value}</span>`
    }
  )
}

function isClosingTag (text) {
  return text.startsWith('</')
}

function isOpeningTag (text) {
  return text.startsWith('<') && !text.startsWith('</') && !text.endsWith('/>')
}

function escapeHtml (value) {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])
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
