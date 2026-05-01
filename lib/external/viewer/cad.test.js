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
  const [toolbar, viewport, axisLegend] = root.children
  const canvas = viewport.children[0]
  const grid = renderer.scene.children[2]
  const axes = renderer.scene.children[3]

  assert.equal(renderer instanceof ThreeCadRenderer, true)
  assert.equal(root.className, 'solidark-cad-viewer')
  assert.equal(toolbar.children.length, 9)
  assert.equal(axisLegend.className, 'solidark-cad-axis-legend')
  assert.equal(axisLegend.attributes['aria-label'], 'Coordinate axes: X is red, Y is green, Z is blue and vertical')
  assert.deepEqual(axisLegend.children.map((child) => [
    child.className,
    child.textContent,
    child.style.properties['--solidark-axis-color'],
    child.attributes.role,
    child.attributes.title,
    child.tabIndex
  ]), [
    ['solidark-cad-axis-label solidark-cad-axis-x', 'X', '#ef4444', 'button', 'Toggle axes', 0],
    ['solidark-cad-axis-label solidark-cad-axis-y', 'Y', '#22c55e', 'button', 'Toggle axes', 0],
    ['solidark-cad-axis-label solidark-cad-axis-z', 'Z', '#3b82f6', 'button', 'Toggle axes', 0]
  ])
  assert.equal(canvas.className, 'solidark-cad-canvas')
  assert.equal(canvas.attributes.role, 'img')
  assert.deepEqual(renderer.perspectiveCamera.up.values, [0, 0, 1])
  assert.deepEqual(renderer.orthographicCamera.up.values, [0, 0, 1])
  assert.equal(grid.name, 'solidark-z-up-grid')
  assert.deepEqual(grid.args.slice(0, 2), [10, 10])
  assert.equal(grid.rotation.x, Math.PI / 2)
  assert.deepEqual(grid.position.values, [1, 1, 0])
  assert.equal(grid.visible, true)
  assert.equal(renderer.gridSize, 10)
  assert.equal(renderer.gridVisible, true)
  assert.equal(axes.name, 'solidark-axes-x-red-y-green-z-blue')
  assert.equal(axes.visible, true)
  assert.equal(axes.material.linewidth, 2)
  assert.equal(axes.material.needsUpdate, true)
  assert.equal(renderer.axesVisible, true)
  assert.equal(renderer.group.children.length, 10)
  assert.equal(renderer.edgesVisible, false)
  assert.equal(renderer.meshEntries.every((entry) => entry.edges.visible === false), true)
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
  assert.equal(renderer.gridVisible, false)
  assert.equal(renderer.grid.visible, false)
  toolbar.children[5].dispatch('click', {})
  assert.equal(renderer.gridVisible, true)
  assert.equal(renderer.grid.visible, true)
  toolbar.children[6].dispatch('click', {})
  assert.equal(renderer.edgesVisible, true)
  assert.equal(renderer.meshEntries.every((entry) => entry.edges.visible === true), true)
  toolbar.children[6].dispatch('click', {})
  assert.equal(renderer.edgesVisible, false)
  assert.equal(renderer.meshEntries.every((entry) => entry.edges.visible === false), true)
  toolbar.children[7].dispatch('click', {})
  assert.equal(renderer.state.mode, 'perspective')
  toolbar.children[7].dispatch('click', {})
  assert.equal(renderer.state.mode, 'orthographic')
  toolbar.children[8].dispatch('click', {})
  assert.equal(renderer.meshEntries[0].surface.material.opacity, 0.38)
  toolbar.children[8].dispatch('click', {})
  assert.equal(renderer.meshEntries[0].surface.material.opacity, 1)

  axisLegend.children[0].dispatch('click', {})
  assert.equal(renderer.axesVisible, false)
  assert.equal(renderer.axes.visible, false)
  assert.equal(axisLegend.classList.contains('is-disabled'), true)
  axisLegend.children[1].dispatch('keydown', {
    key: 'Enter',
    preventDefault () {
      this.prevented = true
    }
  })
  assert.equal(renderer.axesVisible, true)
  assert.equal(renderer.axes.visible, true)
  assert.equal(axisLegend.classList.contains('is-disabled'), false)
  axisLegend.children[2].dispatch('keydown', {
    key: 'Tab',
    preventDefault () {
      this.prevented = true
    }
  })
  assert.equal(renderer.axesVisible, true)
  axisLegend.children[2].dispatch('keydown', {
    key: ' ',
    preventDefault () {
      this.prevented = true
    }
  })
  assert.equal(renderer.axesVisible, false)

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

it('supports configured grid visibility and size', () => {
  const document = createFakeDocument()
  const target = createTarget({ document })
  const renderer = createThreeCadScene(target, [sampleMesh()], {
    gridSize: 24,
    gridVisible: false,
    renderer: createFakeRenderer(),
    three: createFakeThree()
  })

  assert.equal(renderer.gridSize, 24)
  assert.equal(renderer.gridVisible, false)
  assert.deepEqual(renderer.grid.args.slice(0, 2), [24, 10])
  assert.equal(renderer.grid.visible, false)
  renderer.dispose()

  const defaulted = createThreeCadScene(createTarget({ document }), [], {
    gridSize: -1,
    renderer: createFakeRenderer(),
    three: createFakeThree()
  })

  assert.equal(defaulted.gridSize, 10)
  defaulted.dispose()
})

it('expands and centers the grid to cover the model footprint', () => {
  const document = createFakeDocument()
  const renderer = createThreeCadScene(createTarget({ document }), [{
    tag: 'sol-large-cuboid',
    vertices: [
      [4, -8, 0],
      [26, -8, 0],
      [4, 10, 0],
      [26, 10, 4]
    ],
    triangles: [[0, 1, 2]]
  }], {
    gridSize: 10,
    renderer: createFakeRenderer(),
    three: createFakeThree()
  })

  assert.equal(renderer.bounds.footprintSize, 22)
  assert.equal(renderer.gridSize, 24.200000000000003)
  assert.deepEqual(renderer.grid.args.slice(0, 2), [24.200000000000003, 10])
  assert.deepEqual(renderer.grid.position.values, [15, 1, 0])
  renderer.dispose()
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

function createFakeClassList () {
  const values = new Set()

  return {
    contains (name) {
      return values.has(name)
    },
    toggle (name, enabled) {
      if (enabled) {
        values.add(name)
      } else {
        values.delete(name)
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
    classList: createFakeClassList(),
    className: '',
    height: 420,
    listeners,
    style: {
      properties: {},
      setProperty (name, value) {
        this.properties[name] = value
      }
    },
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
    this.material = {}
    this.position = {
      values: [],
      set: (...values) => {
        this.position.values = values
      }
    }
    this.rotation = {}
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
    this.up = {
      values: [],
      set: (...values) => {
        this.up.values = values
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
