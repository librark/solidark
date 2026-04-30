import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  CanvasMeshRenderer,
  Viewer,
  collectMeshTriangles,
  collectPrimitiveEntries,
  createMeshSceneCanvas,
  createMeshSceneSvg,
  createSceneSvg,
  createViewer
} from './viewer.js'

it('createViewer returns a chainable SVG viewer', () => {
  const target = { innerHTML: '', textContent: '' }
  const viewer = createViewer(target)
  const result = {
    shapes: [
      {
        category: 'operation',
        tag: 'sol-union',
        children: [
          { category: 'primitive', tag: 'sol-cuboid', children: [] },
          { category: 'primitive', tag: 'sol-sphere', children: [] }
        ]
      }
    ]
  }

  assert.equal(viewer instanceof Viewer, true)
  assert.equal(viewer.render(result), viewer)
  assert.equal(viewer.result, result)
  assert.match(target.innerHTML, /<svg/)
  assert.match(target.innerHTML, /cuboid/)
  assert.match(target.innerHTML, /sphere/)
  assert.equal(viewer.clear(), viewer)
  assert.equal(viewer.result, null)
  assert.equal(target.innerHTML, '')
  assert.equal(target.textContent, '')
})

it('Viewer works without a target', () => {
  const viewer = new Viewer()
  const result = { shapes: [] }

  viewer.render(result).clear()

  assert.equal(viewer.result, null)
})

it('Viewer falls back to textContent when innerHTML is unavailable', () => {
  const target = { textContent: '' }
  const viewer = new Viewer(target)

  viewer.render({ shapes: [] })

  assert.match(target.textContent, /No geometry/)
  viewer.clear()
  assert.equal(target.textContent, '')
})

it('Viewer renders mesh output when available', () => {
  const target = { innerHTML: '', textContent: '' }
  const viewer = new Viewer(target)
  const result = {
    shapes: [],
    meshes: [
      {
        tag: 'sol-cuboid',
        vertices: [
          [0, 0, 0],
          [2, 0, 0],
          [0, 2, 1]
        ],
        triangles: [[0, 1, 2]]
      }
    ]
  }

  viewer.render(result)

  assert.match(target.innerHTML, /Solidark mesh preview/)
  assert.match(target.innerHTML, /polygon/)
})

it('Viewer renders OpenCascade meshes into an interactive canvas when the target is DOM-like', () => {
  const { target } = createCanvasTarget()
  const viewer = new Viewer(target)
  const result = { shapes: [], meshes: [sampleMesh()] }

  viewer.render(result)

  const canvas = target.children[0]
  assert.equal(viewer.renderer instanceof CanvasMeshRenderer, true)
  assert.equal(canvas.className, 'solidark-viewer-canvas')
  assert.equal(canvas.attributes.role, 'img')
  assert.equal(canvas.captured, undefined)
  assert.equal(canvas.context.ops.some(([operation]) => operation === 'fill'), true)

  const yaw = viewer.renderer.camera.yaw
  canvas.dispatch('pointermove', { clientX: 12, clientY: 8 })
  assert.equal(viewer.renderer.camera.yaw, yaw)

  canvas.dispatch('pointerdown', { clientX: 0, clientY: 0, pointerId: 4, shiftKey: false })
  canvas.dispatch('pointermove', { clientX: 20, clientY: -10 })
  assert.notEqual(viewer.renderer.camera.yaw, yaw)
  assert.equal(canvas.captured, 4)
  canvas.dispatch('pointerup', {})
  assert.equal(viewer.renderer.drag, null)

  canvas.dispatch('pointerdown', { clientX: 0, clientY: 0, pointerId: 5, shiftKey: true })
  canvas.dispatch('pointermove', { clientX: 10, clientY: 6 })
  assert.equal(viewer.renderer.camera.panX, 10)
  assert.equal(viewer.renderer.camera.panY, 6)
  canvas.dispatch('pointerleave', {})

  let prevented = false
  canvas.dispatch('wheel', {
    deltaY: 100,
    preventDefault () {
      prevented = true
    }
  })
  assert.equal(prevented, true)
  assert.ok(viewer.renderer.camera.zoom < 1)

  canvas.dispatch('dblclick', {})
  assert.equal(viewer.renderer.camera.zoom, 1)
  assert.equal(viewer.clear(), viewer)
  assert.equal(viewer.renderer, null)
  assert.equal(target.children.length, 0)
  assert.equal(canvas.listeners.size, 0)
})

it('createMeshSceneCanvas handles empty meshes and fallback canvas dimensions', () => {
  const { target } = createCanvasTarget({ rect: { width: 0, height: 0 } })
  const renderer = createMeshSceneCanvas(target, [])
  const canvas = target.children[0]

  assert.equal(renderer instanceof CanvasMeshRenderer, true)
  assert.equal(canvas.width, 720)
  assert.equal(canvas.height, 420)
  assert.deepEqual(canvas.context.ops.at(-1), ['fillText', 'No geometry', 360, 210])
  assert.equal(renderer.dispose(), renderer)
})

it('Viewer can use global document when a target omits ownerDocument', () => {
  const previousDocument = globalThis.document
  const document = createFakeDocument()
  const { target } = createCanvasTarget({ document })
  delete target.ownerDocument

  try {
    globalThis.document = document
    const viewer = new Viewer(target)

    viewer.render({ shapes: [], meshes: [sampleMesh()] })

    assert.equal(target.children[0].className, 'solidark-viewer-canvas')
    viewer.clear()
  } finally {
    globalThis.document = previousDocument
  }
})

it('Viewer falls back to SVG when a canvas-capable target has no document', () => {
  const previousDocument = globalThis.document
  const target = {
    innerHTML: '',
    textContent: '',
    appendChild () {}
  }

  try {
    globalThis.document = undefined
    const viewer = new Viewer(target)

    viewer.render({ shapes: [], meshes: [sampleMesh()] })

    assert.match(target.innerHTML, /Solidark mesh preview/)
    assert.equal(viewer.renderer, null)
  } finally {
    globalThis.document = previousDocument
  }
})

it('createSceneSvg renders an empty model state', () => {
  assert.match(createSceneSvg([]), /No geometry/)
  assert.match(createSceneSvg(), /No geometry/)
})

it('createMeshSceneSvg renders an empty mesh state', () => {
  assert.match(createMeshSceneSvg([]), /No geometry/)
  assert.match(createMeshSceneSvg(), /No geometry/)
})

it('collectPrimitiveEntries walks descriptor children recursively', () => {
  const primitive = { category: 'primitive', tag: 'sol-cylinder', children: [] }
  const result = collectPrimitiveEntries([
    { category: 'primitive', tag: 'sol-sphere' },
    {
      category: 'operation',
      tag: 'sol-difference',
      children: [
        primitive,
        {
          category: 'transform',
          tag: 'sol-translate',
          children: [
            { category: 'primitive', tag: 'sol-cuboid', children: [] }
          ]
        }
      ]
    }
  ])

  assert.deepEqual(result.map((shape) => shape.tag), ['sol-sphere', 'sol-cylinder', 'sol-cuboid'])
})

it('collectMeshTriangles projects and sorts mesh triangles', () => {
  const result = collectMeshTriangles([
    {
      tag: 'sol-cuboid',
      vertices: [
        [0, 0, 0],
        [4, 0, 0],
        [0, 4, 1],
        [8, 8, 8]
      ],
      triangles: [
        [3, 2, 1],
        [0, 1, 2]
      ]
    }
  ])

  assert.equal(result.length, 2)
  assert.deepEqual(result[0].vertices[0], [0, 0, 0])
  assert.deepEqual(result[0].projected[0], [0, 0])
  assert.equal(result[1].meshIndex, 0)
})

function sampleMesh () {
  return {
    tag: 'sol-cuboid',
    vertices: [
      [0, 0, 0],
      [2, 0, 0],
      [0, 2, 1],
      [4, 0, 0]
    ],
    triangles: [
      [0, 1, 2],
      [0, 0, 0]
    ]
  }
}

function createCanvasTarget ({
  document = createFakeDocument(),
  rect = { width: 640, height: 360 }
} = {}) {
  document.rect = rect

  return {
    target: {
      children: [],
      innerHTML: 'stale',
      ownerDocument: document,
      textContent: 'stale',
      appendChild (child) {
        this.children.push(child)
      },
      replaceChildren (...children) {
        this.children = children
        this.innerHTML = ''
        this.textContent = ''
      }
    }
  }
}

function createFakeDocument () {
  return {
    rect: { width: 640, height: 360 },
    createElement (tag) {
      assert.equal(tag, 'canvas')
      return createFakeCanvas(this.rect)
    }
  }
}

function createFakeCanvas (rect) {
  const context = createFakeContext()
  const listeners = new Map()

  return {
    attributes: {},
    captured: undefined,
    className: '',
    context,
    height: 420,
    listeners,
    tabIndex: -1,
    width: 720,
    addEventListener (event, listener) {
      listeners.set(event, listener)
    },
    dispatch (event, payload) {
      listeners.get(event)(payload)
    },
    getBoundingClientRect () {
      return rect
    },
    getContext (type) {
      assert.equal(type, '2d')
      return context
    },
    removeEventListener (event, listener) {
      if (listeners.get(event) === listener) {
        listeners.delete(event)
      }
    },
    setAttribute (name, value) {
      this.attributes[name] = value
    },
    setPointerCapture (pointerId) {
      this.captured = pointerId
    }
  }
}

function createFakeContext () {
  return {
    ops: [],
    beginPath () {
      this.ops.push(['beginPath'])
    },
    clearRect (...args) {
      this.ops.push(['clearRect', ...args])
    },
    closePath () {
      this.ops.push(['closePath'])
    },
    fill () {
      this.ops.push(['fill'])
    },
    fillRect (...args) {
      this.ops.push(['fillRect', ...args])
    },
    fillText (...args) {
      this.ops.push(['fillText', ...args])
    },
    lineTo (...args) {
      this.ops.push(['lineTo', ...args])
    },
    moveTo (...args) {
      this.ops.push(['moveTo', ...args])
    },
    stroke () {
      this.ops.push(['stroke'])
    }
  }
}
