import {
  SolidarkRuntime,
  createViewer,
  defineSolidarkElements
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
  const viewer = viewerFactory(viewerTarget)

  async function selectModel (id) {
    const model = getShowcaseModel(id)

    title.textContent = model.title
    level.textContent = model.level
    summary.textContent = model.summary
    preview.innerHTML = model.markup

    const element = preview.children[0]
    const result = await runtime.evaluate(element)
    viewer.render(result)
    details.textContent = formatModelDetails(result, countModelTags(model.markup))
    markSelected(list, model.id)

    return result
  }

  list.replaceChildren(...listShowcaseSummaries().map((model) => createModelButton(document, model, selectModel)))

  return {
    selectModel,
    models: listShowcaseSummaries(),
    viewer
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
    `Implicit union: ${result.model.implicitUnion ? 'yes' : 'no'}`
  ]

  for (const [tag, count] of Object.entries(tagCounts).sort()) {
    lines.push(`${tag}: ${count}`)
  }

  return lines.join('\n')
}

export function markSelected (list, id) {
  for (const child of list.children) {
    child.toggleAttribute('aria-current', child.dataset.modelId === id)
  }
}

export async function bootShowcase (document = globalThis.document) {
  defineSolidarkElements()
  const app = createShowcaseApp({ document })
  await app.selectModel('primitives')
  return app
}

/* node:coverage ignore next 3 */
if (globalThis.document) {
  bootShowcase()
}
