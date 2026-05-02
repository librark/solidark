import assert from 'node:assert/strict'
import { it } from 'node:test'

import { useInMemoryKernel } from '../lib/index.js'
import {
  bootShowcase,
  configureShowcaseKernel,
  createModelButton,
  exportFilename,
  formatEvaluationError,
  createOpenCascadeInitOptions,
  createShowcaseApp,
  formatMarkup,
  formatModelDetails,
  highlightMarkup,
  markSelected,
  sourceMarkupForModel,
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
    ['[data-source-code]', createElementStub('code')],
    ['[data-source-path]', createElementStub('span')],
    ['[data-viewer]', createElementStub('sol-viewer')],
    ['[data-export-brep]', createElementStub('button')],
    ['[data-export-step]', createElementStub('button')],
    ['[data-export-stl]', createElementStub('button')]
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
    disabled: false,
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
  const element = {
    markup,
    localName: 'sol-model',
    children: []
  }

  if (markup.includes('updated-preview')) {
    element.updated = Promise.resolve(element)
  }

  return element
}

function createModelLoader (markups = {}) {
  return async function modelLoader (id) {
    return {
      id,
      markup: markups[id] || '<sol-model><sol-cuboid></sol-cuboid></sol-model>'
    }
  }
}

it('creates a showcase app and selects models', async () => {
  const document = createDocumentStub()
  const evaluations = []
  const renders = []
  const downloads = []
  const app = createShowcaseApp({
    document,
    downloaders: {
      brep (result, options) {
        downloads.push(['brep', result, options])
      },
      step (result, options) {
        downloads.push(['step', result, options])
      },
      stl (result, options) {
        downloads.push(['stl', result, options])
      }
    },
    modelLoader: createModelLoader({
      bracket: '<sol-model><sol-cuboid></sol-cuboid><sol-cuboid></sol-cuboid><sol-cuboid></sol-cuboid><sol-cylinder></sol-cylinder><sol-cylinder></sol-cylinder></sol-model>'
    }),
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
  document.nodes.get('[data-export-step]').listeners.click()

  assert.equal(result.shapes[0].tag, 'sol-union')
  assert.equal(evaluations.length, 1)
  assert.equal(renders.length, 1)
  assert.equal(document.nodes.get('[data-export-step]').disabled, false)
  assert.equal(document.nodes.get('[data-export-stl]').disabled, false)
  assert.deepEqual(downloads.map(([type, exportedResult, options]) => [type, exportedResult, options.filename]), [
    ['step', result, 'bracket.step']
  ])
  assert.equal(document.nodes.get('[data-title]').textContent, 'Parametric Bracket')
  assert.equal(document.nodes.get('[data-level]').textContent, 'Intermediate · HTML')
  assert.equal(document.nodes.get('[data-source-path]').textContent, './examples/bracket.html')
  assert.match(document.nodes.get('[data-source-code]').innerHTML, /source-token-name">sol-cuboid/)
  assert.match(document.nodes.get('[data-details]').textContent, /sol-cuboid: 3/)
})

it('ignores export button clicks before a model is ready', () => {
  const document = createDocumentStub()
  const downloads = []

  createShowcaseApp({
    document,
    downloaders: {
      brep () {
        downloads.push('brep')
      },
      step () {
        downloads.push('step')
      },
      stl () {
        downloads.push('stl')
      }
    },
    modelLoader: createModelLoader(),
    runtime: {},
    viewerFactory () {
      return {
        render () {
          return this
        }
      }
    }
  })

  document.nodes.get('[data-export-brep]').listeners.click()
  assert.deepEqual(downloads, [])
  assert.equal(document.nodes.get('[data-export-brep]').disabled, true)
})

it('shows export errors in the model details panel', async () => {
  const document = createDocumentStub()

  const app = createShowcaseApp({
    document,
    downloaders: {
      step () {
        throw new Error('STEP export failed')
      }
    },
    modelLoader: createModelLoader(),
    runtime: {
      async evaluate () {
        return {
          model: { tag: 'sol-model', implicitUnion: true },
          shapes: [{ tag: 'sol-cuboid' }],
          meshes: [{ tag: 'sol-cuboid' }]
        }
      }
    },
    viewerFactory () {
      return {
        render () {
          return this
        }
      }
    }
  })

  await app.selectModel('primitives')
  document.nodes.get('[data-export-step]').listeners.click()

  assert.equal(document.nodes.get('[data-details]').textContent, 'Evaluation failed: STEP export failed')
})

it('tolerates missing export buttons in embedded showcase shells', () => {
  const document = createDocumentStub()

  document.nodes.delete('[data-export-brep]')
  createShowcaseApp({
    document,
    modelLoader: createModelLoader(),
    runtime: {},
    viewerFactory () {
      return {
        render () {
          return this
        }
      }
    }
  })

  assert.equal(document.nodes.get('[data-export-step]').disabled, true)
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
    modelLoader: createModelLoader({
      primitives: '<sol-model class="updated-preview"><sol-cuboid></sol-cuboid></sol-model>'
    }),
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
    modelLoader: createModelLoader(),
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
  assert.equal(document.nodes.get('[data-export-step]').disabled, true)
  assert.equal(document.nodes.get('[data-details]').textContent, 'Evaluation failed: kernel failed')
  assert.equal(formatEvaluationError('bad input'), 'Evaluation failed: bad input')
  assert.equal(formatEvaluationError({
    diagnostics: [{
      cause: 'OpenCascade binding not found: Missing_Binding',
      errorCategory: 'kernel-operation-failure',
      method: 'cuboid',
      path: 'sol-model > sol-cuboid[0]',
      suggestion: 'Check the component inputs and underlying kernel support for this operation.',
      stage: 'evaluate'
    }]
  }), [
    'Evaluation failed: OpenCascade binding not found: Missing_Binding',
    'Component: sol-model > sol-cuboid[0]',
    'Kernel method: cuboid',
    'Stage: evaluate',
    'Error category: kernel-operation-failure',
    'Suggestion: Check the component inputs and underlying kernel support for this operation.'
  ].join('\n'))
})

it('reports sol-viewer refresh errors when no clear method is present', async () => {
  const document = createDocumentStub()
  const error = new Error('viewer failed')

  document.nodes.get('[data-viewer]').refresh = async () => {
    throw error
  }
  const app = createShowcaseApp({
    document,
    modelLoader: createModelLoader(),
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
  const entry = createModelButton(document, {
    id: 'primitives',
    title: 'Primitive Set',
    level: 'Basic',
    format: 'HTML',
    source: './examples/primitives.html'
  }, (id) => {
    selected = id
  })
  const [button, link] = entry.children

  button.listeners.click()

  assert.equal(entry.dataset.modelId, 'primitives')
  assert.equal(button.type, 'button')
  assert.equal(button.dataset.modelId, 'primitives')
  assert.equal(button.innerHTML.includes('Primitive Set'), true)
  assert.equal(link.href, './examples/primitives.html')
  assert.equal(link.textContent, 'Open standalone')
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
  assert.equal(
    highlightMarkup('<sol-cuboid centered size="2 & 3"></sol-cuboid>'),
    '<span class="source-token-tag">&lt;</span><span class="source-token-name">sol-cuboid</span> <span class="source-token-attribute">centered</span> <span class="source-token-attribute">size</span>=<span class="source-token-value">&quot;2 &amp; 3&quot;</span><span class="source-token-tag">&gt;</span>\n<span class="source-token-tag">&lt;/</span><span class="source-token-name">sol-cuboid</span><span class="source-token-tag">&gt;</span>'
  )
  assert.equal(
    formatMarkup('  <sol-model><sol-translate by="1 0 0"><sol-cuboid></sol-cuboid></sol-translate><sol-sphere /></sol-model>  '),
    '<sol-model>\n  <sol-translate by="1 0 0">\n    <sol-cuboid>\n    </sol-cuboid>\n  </sol-translate>\n  <sol-sphere />\n</sol-model>'
  )
  assert.equal(
    formatMarkup('<sol-model>\n  \n<sol-cuboid></sol-cuboid>\n</sol-model>'),
    '<sol-model>\n  <sol-cuboid>\n  </sol-cuboid>\n</sol-model>'
  )
  assert.equal(formatMarkup(''), '')
  assert.equal(
    sourceMarkupForModel(
      { format: 'Component' },
      { markup: '<showcase-enclosure></showcase-enclosure>' },
      { innerHTML: ' <sol-model><sol-cuboid></sol-cuboid></sol-model> ' }
    ),
    '<sol-model><sol-cuboid></sol-cuboid></sol-model>'
  )
  assert.equal(
    sourceMarkupForModel(
      { format: 'HTML' },
      { markup: '<sol-model></sol-model>' },
      { innerHTML: '<sol-cuboid></sol-cuboid>' }
    ),
    '<sol-model></sol-model>'
  )
  assert.equal(
    sourceMarkupForModel(
      { format: 'Component' },
      { markup: '<showcase-enclosure></showcase-enclosure>' },
      null
    ),
    '<showcase-enclosure></showcase-enclosure>'
  )
  assert.equal(exportFilename({ id: 'Profile Operations!' }, 'step'), 'profile-operations.step')
  assert.equal(exportFilename({ id: '---' }, 'brep'), 'solidark-model.brep')
  assert.equal(exportFilename(null, 'stl'), 'solidark-model.stl')
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
  const app = await bootShowcase(document, { mode: 'memory', modelLoader: createModelLoader() })

  assert.equal(app.models[0].id, 'primitives')
  assert.equal(document.nodes.get('[data-title]').textContent, 'Primitive Set')
  assert.match(document.nodes.get('[data-details]').textContent, /Root: sol-model/)
})
