import assert from 'node:assert/strict'
import { it } from 'node:test'

import { useInMemoryKernel } from '../lib/index.js'
import { bootShowcase, createModelButton, createShowcaseApp, formatModelDetails, markSelected } from './main.js'

function createDocumentStub () {
  const nodes = new Map([
    ['[data-model-list]', createElementStub('div')],
    ['[data-preview]', createElementStub('div')],
    ['[data-title]', createElementStub('h1')],
    ['[data-level]', createElementStub('p')],
    ['[data-summary]', createElementStub('p')],
    ['[data-details]', createElementStub('pre')],
    ['[data-viewer]', createElementStub('pre')]
  ])

  return {
    querySelector (selector) {
      return nodes.get(selector)
    },
    createElement: createElementStub,
    nodes
  }
}

function createElementStub (tag) {
  return {
    tag,
    type: '',
    dataset: {},
    children: [],
    textContent: '',
    _innerHTML: '',
    listeners: {},
    set innerHTML (value) {
      this._innerHTML = value
      this.children = [createModelElementStub(value)]
    },
    get innerHTML () {
      return this._innerHTML
    },
    replaceChildren (...children) {
      this.children = children
    },
    addEventListener (event, handler) {
      this.listeners[event] = handler
    },
    toggleAttribute (name, enabled) {
      this[name] = enabled
    }
  }
}

function createModelElementStub (markup) {
  return {
    markup,
    localName: 'sol-model',
    children: []
  }
}

it('creates a showcase app and selects models', async () => {
  const document = createDocumentStub()
  const evaluations = []
  const renders = []
  const app = createShowcaseApp({
    document,
    runtime: {
      async evaluate (element) {
        evaluations.push(element.markup)
        return {
          model: { tag: element.localName, implicitUnion: true },
          shapes: [{ tag: 'sol-union' }]
        }
      }
    },
    viewerFactory () {
      return {
        render (result) {
          renders.push(result)
          return this
        }
      }
    }
  })

  assert.equal(app.models.length >= 5, true)
  assert.equal(document.nodes.get('[data-model-list]').children.length, app.models.length)

  const result = await app.selectModel('bracket')

  assert.equal(result.shapes[0].tag, 'sol-union')
  assert.equal(evaluations.length, 1)
  assert.equal(renders.length, 1)
  assert.equal(document.nodes.get('[data-title]').textContent, 'Parametric Bracket')
  assert.match(document.nodes.get('[data-details]').textContent, /sol-cuboid: 3/)
})

it('createModelButton event handlers select models', () => {
  const document = { createElement: createElementStub }
  let selected = ''
  const button = createModelButton(document, {
    id: 'primitives',
    title: 'Primitive Set',
    level: 'Basic'
  }, (id) => {
    selected = id
  })

  button.listeners.click()

  assert.equal(button.type, 'button')
  assert.equal(button.dataset.modelId, 'primitives')
  assert.equal(button.innerHTML.includes('Primitive Set'), true)
  assert.equal(selected, 'primitives')
})

it('formats model details and marks selected buttons', () => {
  const list = {
    children: [
      { dataset: { modelId: 'a' }, toggleAttribute (name, enabled) { this[name] = enabled } },
      { dataset: { modelId: 'b' }, toggleAttribute (name, enabled) { this[name] = enabled } }
    ]
  }

  markSelected(list, 'b')

  assert.equal(list.children[0]['aria-current'], false)
  assert.equal(list.children[1]['aria-current'], true)
  assert.equal(
    formatModelDetails(
      { model: { tag: 'sol-model', implicitUnion: false }, shapes: [] },
      { 'sol-model': 1 }
    ),
    'Root: sol-model\nShapes: 0\nImplicit union: no\nsol-model: 1'
  )
})

it('boots the showcase with default runtime wiring', async () => {
  useInMemoryKernel()
  const document = createDocumentStub()
  const app = await bootShowcase(document)

  assert.equal(app.models[0].id, 'primitives')
  assert.equal(document.nodes.get('[data-title]').textContent, 'Primitive Set')
  assert.match(document.nodes.get('[data-details]').textContent, /Root: sol-model/)
})
