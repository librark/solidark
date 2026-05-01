import assert from 'node:assert/strict'
import { it } from 'node:test'

import { useInMemoryKernel } from '../lib/index.js'
import {
  bootShowcase,
  configureShowcaseKernel,
  createModelButton,
  formatEvaluationError,
  createOpenCascadeInitOptions,
  createShowcaseApp,
  formatModelDetails,
  markSelected,
  showcaseKernelMode
} from './main.js'

function createDocumentStub () {
  const nodes = new Map([
    ['[data-model-list]', createElementStub('div')],
    ['[data-preview]', createElementStub('div')],
    ['[data-title]', createElementStub('h1')],
    ['[data-level]', createElementStub('p')],
    ['[data-summary]', createElementStub('p')],
    ['[data-details]', createElementStub('pre')],
    ['[data-viewer]', createElementStub('sol-viewer')]
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
          shapes: [{ tag: 'sol-union' }],
          meshes: [{ tag: 'sol-union' }]
        }
      }
    },
    viewerFactory () {
      return {
        render (result) {
          renders.push(result)
          return this
        },
        clear () {
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

it('uses sol-viewer refresh when the showcase viewer target provides it', async () => {
  const document = createDocumentStub()
  const viewerTarget = document.nodes.get('[data-viewer]')
  const refreshed = []
  const runtime = {
    name: 'runtime'
  }
  const result = {
    model: { tag: 'sol-model', implicitUnion: false },
    shapes: [{ tag: 'sol-union' }],
    meshes: [{ tag: 'sol-union' }]
  }

  viewerTarget.refresh = async (element, options) => {
    refreshed.push([element.markup, options.runtime])
    return result
  }
  const app = createShowcaseApp({
    document,
    runtime,
    viewerFactory () {
      throw new Error('viewer factory should not be used')
    }
  })

  assert.equal(await app.selectModel('primitives'), result)
  assert.equal(refreshed.length, 1)
  assert.equal(refreshed[0][1], runtime)
  assert.match(document.nodes.get('[data-details]').textContent, /Meshes: 1/)
})

it('reports showcase evaluation errors', async () => {
  const document = createDocumentStub()
  const error = new Error('kernel failed')
  let clears = 0
  const app = createShowcaseApp({
    document,
    runtime: {
      async evaluate () {
        throw error
      }
    },
    viewerFactory () {
      return {
        render () {
          return this
        },
        clear () {
          clears += 1
          return this
        }
      }
    }
  })

  await assert.rejects(() => app.selectModel('primitives'), error)

  assert.equal(clears, 1)
  assert.equal(document.nodes.get('[data-details]').textContent, 'Evaluation failed: kernel failed')
  assert.equal(formatEvaluationError('bad input'), 'Evaluation failed: bad input')
})

it('reports sol-viewer refresh errors when no clear method is present', async () => {
  const document = createDocumentStub()
  const error = new Error('viewer failed')

  document.nodes.get('[data-viewer]').refresh = async () => {
    throw error
  }
  const app = createShowcaseApp({
    document,
    runtime: {},
    viewerFactory () {
      throw new Error('viewer factory should not be used')
    }
  })

  await assert.rejects(() => app.selectModel('primitives'), error)
  assert.equal(document.nodes.get('[data-details]').textContent, 'Evaluation failed: viewer failed')
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
      { model: { tag: 'sol-model', implicitUnion: false }, shapes: [], meshes: [] },
      { 'sol-model': 1 }
    ),
    'Root: sol-model\nShapes: 0\nMeshes: 0\nImplicit union: no\nsol-model: 1'
  )
})

it('configures showcase kernel loading modes', async () => {
  const configured = []
  const runtime = {
    configure (options) {
      configured.push(options)
      return this
    }
  }

  assert.equal(showcaseKernelMode(), 'memory')
  assert.equal(showcaseKernelMode('http://localhost/showcase/'), 'opencascade')
  assert.equal(showcaseKernelMode('http://localhost/showcase/?kernel=memory'), 'memory')
  assert.equal(showcaseKernelMode({ search: '?kernel=opencascade' }), 'opencascade')
  assert.equal(createOpenCascadeInitOptions().locateFile('opencascade.wasm.wasm'), '/node_modules/opencascade.js/dist/opencascade.wasm.wasm')
  assert.equal(createOpenCascadeInitOptions({ wasmPath: '/kernel.wasm' }).locateFile('other.data'), 'other.data')
  assert.equal(configureShowcaseKernel({ mode: 'memory', runtime }), 'memory')
  assert.equal(configureShowcaseKernel({
    kernelFactory (options) {
      assert.equal(options.initOptions.locateFile('opencascade.wasm.wasm'), '/custom.wasm')
      return { name: 'opencascade' }
    },
    mode: 'opencascade',
    runtime,
    wasmPath: '/custom.wasm'
  }), 'opencascade')

  assert.equal(configured.length, 2)
  assert.equal(configured[0].kernel.name, 'in-memory')
  assert.deepEqual(await configured[1].loader(), { name: 'opencascade' })
})

it('boots the showcase with default runtime wiring', async () => {
  useInMemoryKernel()
  const document = createDocumentStub()
  const app = await bootShowcase(document, { mode: 'memory' })

  assert.equal(app.models[0].id, 'primitives')
  assert.equal(document.nodes.get('[data-title]').textContent, 'Primitive Set')
  assert.match(document.nodes.get('[data-details]').textContent, /Root: sol-model/)
})
