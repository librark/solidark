import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ThreeCadRenderer, canUseThreeTarget, createThreeCadScene } from './cad.js'

it('detects whether a target can use the Three.js CAD renderer', () => {
  const document = createFakeDocument()
  const target = createTarget({ document })

  assert.equal(canUseThreeTarget(null), false)
  assert.equal(canUseThreeTarget({ appendChild () {} }), false)
  assert.equal(canUseThreeTarget(target), true)
  assert.equal(canUseThreeTarget(createTarget({
    document: {
      defaultView: createFakeWindow(),
      createElement () {
        return {
          getContext (type) {
            return type === 'webgl' ? {} : null
          }
        }
      }
    }
  })), true)
  assert.equal(canUseThreeTarget(createTarget({
    document: {
      defaultView: createFakeWindow(),
      createElement () {
        return {}
      }
    }
  })), false)
  assert.equal(canUseThreeTarget(createTarget({
    document: {
      defaultView: createFakeWindow(),
      createElement () {
        throw new Error('canvas unavailable')
      }
    }
  })), false)

  delete document.defaultView.WebGLRenderingContext
  assert.equal(canUseThreeTarget({ appendChild () {} }), false)
  assert.equal(canUseThreeTarget(target), false)
  assert.equal(canUseThreeTarget(target, { three: createFakeThree() }), true)
})

it('renders meshes into a Three.js CAD viewport with controls', () => {
  const document = createFakeDocument()
  const target = createTarget({ document })
  const three = createFakeThree()
  const renderer = createThreeCadScene(target, [
    sampleMesh({ color: '#ff0000' }),
    sampleMesh({ color: [0, 0.5, 1], tag: 'sol-sphere' }),
    sampleMesh({ tag: 'sol-cone' }),
    { ...sampleMesh({ tag: 'sol-cylinder' }), styling: { color: '#22c55e' } },
    sampleMesh({ tag: null })
  ], { three })
  const root = target.children[0]
  const [toolbar, viewport] = root.children
  const canvas = viewport.children[0]

  assert.equal(renderer instanceof ThreeCadRenderer, true)
  assert.equal(root.className, 'solidark-cad-viewer')
  assert.equal(toolbar.children.length, 7)
  assert.equal(canvas.className, 'solidark-cad-canvas')
  assert.equal(canvas.attributes.role, 'img')
  assert.equal(renderer.group.children.length, 10)
  assert.equal(renderer.meshEntries[0].surface.material.options.color, '#ff0000')
  assert.equal(renderer.meshEntries[1].surface.material.options.color, 'rgb(0 128 255)')
  assert.equal(renderer.meshEntries[2].surface.material.options.color, '#d94f45')
  assert.equal(renderer.meshEntries[3].surface.material.options.color, '#22c55e')
  assert.equal(renderer.meshEntries[4].surface.name, 'solidark-mesh-4')
  assert.equal(renderer.renderer.renders.length, 1)

  canvas.dispatch('pointermove', { clientX: 4, clientY: 5 })
  canvas.dispatch('pointerdown', { clientX: 0, clientY: 0, pointerId: 7, shiftKey: false })
  canvas.dispatch('pointermove', { clientX: 20, clientY: -10 })
  assert.equal(canvas.captured, 7)
  assert.notEqual(renderer.state.theta, -Math.PI / 4)
  canvas.dispatch('pointerup', {})
  assert.equal(renderer.drag, null)

  canvas.dispatch('pointerdown', { clientX: 0, clientY: 0, pointerId: 8, shiftKey: true })
  canvas.dispatch('pointermove', { clientX: 10, clientY: 8 })
  assert.notDeepEqual(renderer.state.target, renderer.bounds.center)
  canvas.dispatch('pointerleave', {})

  let prevented = false
  canvas.dispatch('wheel', {
    deltaY: 100,
    preventDefault () {
      prevented = true
    }
  })
  assert.equal(prevented, true)

  toolbar.children[0].dispatch('click', {})
  toolbar.children[1].dispatch('click', {})
  toolbar.children[2].dispatch('click', {})
  toolbar.children[3].dispatch('click', {})
  toolbar.children[4].dispatch('click', {})
  toolbar.children[5].dispatch('click', {})
  assert.equal(renderer.state.mode, 'perspective')
  toolbar.children[5].dispatch('click', {})
  assert.equal(renderer.state.mode, 'orthographic')
  toolbar.children[6].dispatch('click', {})
  assert.equal(renderer.meshEntries[0].surface.material.opacity, 0.38)
  toolbar.children[6].dispatch('click', {})
  assert.equal(renderer.meshEntries[0].surface.material.opacity, 1)

  canvas.dispatch('dblclick', {})
  document.defaultView.dispatch('resize', {})
  assert.equal(renderer.dispose(), renderer)
  assert.equal(canvas.listeners.size, 0)
  assert.equal(document.defaultView.listeners.size, 0)
  assert.equal(renderer.renderer.disposed, true)
  assert.equal(renderer.meshEntries.every((entry) => entry.geometry.disposed && entry.edgeGeometry.disposed), true)
})

it('supports explicit renderer injection and fallback target clearing', () => {
  const document = createFakeDocument({ withRect: false, withWindow: false })
  const target = createTarget({ document, replaceChildren: false })
  const renderer = createFakeRenderer()

  renderer.domElement.width = undefined
  renderer.domElement.height = undefined
  const scene = createThreeCadScene(target, [], { renderer, three: createFakeThree() })

  assert.equal(target.textContent, '')
  assert.equal(target.children[0].className, 'solidark-cad-viewer')
  assert.equal(scene.renderer, renderer)
  assert.equal(scene.bounds.size, 1)
  assert.equal(scene.renderer.sizes[0].width, 720)
  assert.equal(scene.renderer.sizes[0].height, 420)
  scene.dispose()
})

it('uses global document and the default Three.js module when not injected', () => {
  const previousDocument = globalThis.document
  const document = createFakeDocument()
  const target = createTarget({ document })
  const renderer = createFakeRenderer()

  delete target.ownerDocument

  try {
    globalThis.document = document
    const scene = createThreeCadScene(target, [sampleMesh()], { renderer })

    assert.equal(scene.three.Scene.name, 'Scene')
    assert.equal(target.children[0].className, 'solidark-cad-viewer')
    scene.dispose()
  } finally {
    globalThis.document = previousDocument
  }
})

function sampleMesh ({ color, tag = 'sol-cuboid' } = {}) {
  return {
    color,
    tag,
    vertices: [
      [0, 0, 0],
      [2, 0, 0],
      [0, 2, 1],
      [2, 2, 1]
    ],
    triangles: [
      [0, 1, 2],
      [1, 3, 2]
    ]
  }
}

function createTarget ({
  document,
  replaceChildren = true
}) {
  return {
    children: [],
    ownerDocument: document,
    textContent: 'stale',
    appendChild (child) {
      this.children.push(child)
    },
    replaceChildren: replaceChildren
      ? function replace (...children) {
        this.children = children
        this.textContent = ''
      }
      : undefined
  }
}

function createFakeDocument ({ withRect = true, withWindow = true } = {}) {
  return {
    defaultView: withWindow ? createFakeWindow() : undefined,
    createElement (tag) {
      return createFakeElement(tag, { withRect })
    }
  }
}

function createFakeWindow () {
  const listeners = new Map()

  return {
    WebGLRenderingContext: function WebGLRenderingContext () {},
    devicePixelRatio: 1.5,
    listeners,
    addEventListener (event, listener) {
      listeners.set(event, listener)
    },
    dispatch (event, payload) {
      listeners.get(event)(payload)
    },
    removeEventListener (event, listener) {
      if (listeners.get(event) === listener) {
        listeners.delete(event)
      }
    }
  }
}

function createFakeElement (tag, { withRect = true } = {}) {
  const listeners = new Map()

  return {
    attributes: {},
    captured: undefined,
    children: [],
    className: '',
    height: 420,
    listeners,
    tag,
    textContent: '',
    width: 720,
    appendChild (child) {
      this.children.push(child)
    },
    addEventListener (event, listener) {
      listeners.set(event, listener)
    },
    dispatch (event, payload) {
      listeners.get(event)(payload)
    },
    getContext (type) {
      return tag === 'canvas' && (type === 'webgl2' || type === 'webgl') ? {} : null
    },
    getBoundingClientRect: withRect
      ? function getBoundingClientRect () {
        return tag === 'div' && this.className === 'solidark-cad-viewport'
          ? { width: 640, height: 360 }
          : { width: 0, height: 0 }
      }
      : undefined,
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

function createFakeThree () {
  return {
    AmbientLight: class AmbientLight extends FakeObject {},
    AxesHelper: class AxesHelper extends FakeObject {},
    BufferGeometry: FakeGeometry,
    DirectionalLight: class DirectionalLight extends FakeObject {},
    DoubleSide: 'double-side',
    EdgesGeometry: FakeGeometry,
    Float32BufferAttribute: class Float32BufferAttribute {
      constructor (values, size) {
        this.values = values
        this.size = size
      }
    },
    GridHelper: class GridHelper extends FakeObject {},
    Group: FakeGroup,
    LineBasicMaterial: FakeMaterial,
    LineSegments: FakeMesh,
    Mesh: FakeMesh,
    MeshStandardMaterial: FakeMaterial,
    OrthographicCamera: FakeCamera,
    PerspectiveCamera: FakeCamera,
    Scene: FakeGroup,
    WebGLRenderer: FakeRenderer
  }
}

class FakeObject {
  constructor (...args) {
    this.args = args
  }
}

class FakeGroup {
  constructor () {
    this.children = []
  }

  add (child) {
    this.children.push(child)
  }
}

class FakeGeometry {
  constructor (...args) {
    this.args = args
    this.disposed = false
  }

  computeVertexNormals () {
    this.normals = true
  }

  dispose () {
    this.disposed = true
  }

  setAttribute (name, value) {
    this.attribute = { name, value }
  }

  setIndex (value) {
    this.index = value
  }
}

class FakeMaterial {
  constructor (options) {
    this.options = options
    this.opacity = 1
    this.transparent = false
  }

  dispose () {
    this.disposed = true
  }
}

class FakeMesh {
  constructor (geometry, material) {
    this.geometry = geometry
    this.material = material
    this.name = ''
  }
}

class FakeCamera {
  constructor () {
    this.position = {
      values: [],
      set: (...values) => {
        this.position.values = values
      }
    }
  }

  lookAt (...values) {
    this.lookAtValues = values
  }

  updateProjectionMatrix () {
    this.updated = true
  }
}

class FakeRenderer {
  constructor () {
    this.disposed = false
    this.domElement = createFakeElement('canvas')
    this.pixelRatios = []
    this.renders = []
    this.sizes = []
  }

  dispose () {
    this.disposed = true
  }

  render (scene, camera) {
    this.renders.push({ camera, scene })
  }

  setPixelRatio (value) {
    this.pixelRatios.push(value)
  }

  setSize (width, height, updateStyle) {
    this.sizes.push({ height, updateStyle, width })
    this.domElement.width = width
    this.domElement.height = height
  }
}

function createFakeRenderer () {
  return new FakeRenderer()
}
