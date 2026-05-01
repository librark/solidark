import * as Three from 'three'

const DEFAULT_COLORS = ['#4f7cac', '#2f9f7b', '#d94f45', '#d28f2d', '#8b5fbf', '#64748b']
const EDGE_COLOR = '#1f2937'
const AXES = [
  ['x', '#ef4444'],
  ['y', '#22c55e'],
  ['z', '#3b82f6']
]

export function canUseThreeTarget (target, options = {}) {
  const document = target?.ownerDocument || globalThis.document
  const view = document?.defaultView || globalThis

  return Boolean(
    target &&
    typeof target.appendChild === 'function' &&
    document &&
    typeof document.createElement === 'function' &&
    (options.three || (view?.WebGLRenderingContext && canCreateWebGlContext(document)))
  )
}

export function createThreeCadScene (target, meshes = [], options = {}) {
  return new ThreeCadRenderer(target, meshes, options)
}

export class ThreeCadRenderer {
  constructor (target, meshes = [], options = {}) {
    this.target = target
    this.meshes = meshes
    this.three = options.three || Three
    this.document = target.ownerDocument || globalThis.document
    this.window = this.document?.defaultView || globalThis
    this.bounds = meshBounds(meshes)
    this.state = {
      mode: 'orthographic',
      target: this.bounds.center,
      radius: this.bounds.size * 2.2,
      theta: -Math.PI / 4,
      phi: Math.PI / 3
    }
    this.drag = null
    this.axesVisible = true
    this.edgesVisible = false
    this.gridSize = viewerGridSize(options.gridSize, this.bounds)
    this.gridVisible = options.gridVisible !== false
    this.xray = false
    this.root = createElement(this.document, 'div', 'solidark-cad-viewer')
    this.toolbar = createElement(this.document, 'div', 'solidark-cad-toolbar')
    this.viewport = createElement(this.document, 'div', 'solidark-cad-viewport')
    this.axisLegend = createAxisLegend(this.document, () => this.toggleAxes())
    this.scene = new this.three.Scene()
    this.group = new this.three.Group()
    this.renderer = createWebGlRenderer(this.three, options)
    this.perspectiveCamera = new this.three.PerspectiveCamera(45, 1, 0.01, this.bounds.size * 100)
    this.orthographicCamera = new this.three.OrthographicCamera(-1, 1, 1, -1, 0.01, this.bounds.size * 100)
    setCameraZUp(this.perspectiveCamera)
    setCameraZUp(this.orthographicCamera)
    this.camera = this.orthographicCamera
    this.listeners = createPointerListeners(this)

    this.root.appendChild(this.toolbar)
    this.root.appendChild(this.viewport)
    this.root.appendChild(this.axisLegend)
    this.viewport.appendChild(this.renderer.domElement)
    this.createToolbar()
    this.createScene()
    this.attach()
    clearTarget(target)
    target.appendChild(this.root)
    this.fit()
  }

  createToolbar () {
    this.toolbar.appendChild(createButton(this.document, 'ISO', 'Isometric view', () => this.view('isometric')))
    this.toolbar.appendChild(createButton(this.document, 'TOP', 'Top view', () => this.view('top')))
    this.toolbar.appendChild(createButton(this.document, 'FRONT', 'Front view', () => this.view('front')))
    this.toolbar.appendChild(createButton(this.document, 'RIGHT', 'Right view', () => this.view('right')))
    this.toolbar.appendChild(createButton(this.document, 'FIT', 'Fit model', () => this.fit()))
    this.toolbar.appendChild(createButton(this.document, 'GRID', 'Toggle grid display', () => this.toggleGrid()))
    this.toolbar.appendChild(createButton(this.document, 'EDGE', 'Toggle mesh edge display', () => this.toggleEdges()))
    this.toolbar.appendChild(createButton(this.document, 'ORTHO', 'Toggle orthographic camera', () => this.toggleCamera()))
    this.toolbar.appendChild(createButton(this.document, 'X', 'Toggle x-ray display', () => this.toggleXray()))
  }

  createScene () {
    this.scene.add(new this.three.AmbientLight('#ffffff', 0.55))
    this.scene.add(new this.three.DirectionalLight('#ffffff', 0.82))
    this.grid = createZUpGrid(this.three, this.gridSize, this.bounds)
    this.grid.visible = this.gridVisible
    this.axes = createNamedAxes(this.three, this.bounds.size)
    this.axes.visible = this.axesVisible
    this.scene.add(this.grid)
    this.scene.add(this.axes)
    this.scene.add(this.group)

    this.meshEntries = this.meshes.map((mesh, index) => this.createMeshEntry(mesh, index))
    this.meshEntries.forEach((entry) => {
      this.group.add(entry.surface)
      this.group.add(entry.edges)
    })
  }

  createMeshEntry (mesh, index) {
    const geometry = new this.three.BufferGeometry()
    const positions = mesh.vertices.flat()
    const indices = mesh.triangles.flat()

    geometry.setAttribute('position', new this.three.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const surface = new this.three.Mesh(geometry, new this.three.MeshStandardMaterial({
      color: meshColor(mesh, index),
      metalness: 0.08,
      roughness: 0.62,
      side: this.three.DoubleSide
    }))
    const edgeGeometry = new this.three.EdgesGeometry(geometry)
    const edges = new this.three.LineSegments(
      edgeGeometry,
      new this.three.LineBasicMaterial({ color: EDGE_COLOR })
    )

    surface.name = mesh.tag || `solidark-mesh-${index}`
    edges.name = `${surface.name}-edges`
    edges.visible = this.edgesVisible

    return { edgeGeometry, edges, geometry, surface }
  }

  attach () {
    const element = this.renderer.domElement

    element.className = 'solidark-cad-canvas'
    element.tabIndex = 0
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', 'Interactive Solidark CAD viewer')

    for (const [event, listener] of Object.entries(this.listeners)) {
      element.addEventListener(event, listener)
    }

    if (typeof this.window?.addEventListener === 'function') {
      this.window.addEventListener('resize', this.listeners.resize)
    }

    return this
  }

  dispose () {
    const element = this.renderer.domElement

    for (const [event, listener] of Object.entries(this.listeners)) {
      element.removeEventListener(event, listener)
    }

    if (typeof this.window?.removeEventListener === 'function') {
      this.window.removeEventListener('resize', this.listeners.resize)
    }

    this.meshEntries.forEach((entry) => {
      entry.geometry.dispose()
      entry.edgeGeometry.dispose()
      entry.surface.material.dispose()
      entry.edges.material.dispose()
    })
    this.renderer.dispose()
    return this
  }

  view (name) {
    const views = {
      front: [0, Math.PI / 2],
      isometric: [-Math.PI / 4, Math.PI / 3],
      right: [0, Math.PI / 2],
      top: [-Math.PI / 2, 0.01]
    }
    const [theta, phi] = views[name]

    this.state.theta = name === 'right' ? Math.PI / 2 : theta
    this.state.phi = phi
    this.render()
    return this
  }

  fit () {
    this.state.target = this.bounds.center
    this.state.radius = this.bounds.size * 2.2
    this.render()
    return this
  }

  toggleCamera () {
    this.state.mode = this.state.mode === 'orthographic' ? 'perspective' : 'orthographic'
    this.camera = this.state.mode === 'orthographic' ? this.orthographicCamera : this.perspectiveCamera
    this.render()
    return this
  }

  toggleAxes () {
    this.axesVisible = !this.axesVisible
    this.axes.visible = this.axesVisible
    this.axisLegend.classList.toggle('is-disabled', !this.axesVisible)
    this.render()
    return this
  }

  toggleEdges () {
    this.edgesVisible = !this.edgesVisible

    for (const entry of this.meshEntries) {
      entry.edges.visible = this.edgesVisible
    }

    this.render()
    return this
  }

  toggleGrid () {
    this.gridVisible = !this.gridVisible
    this.grid.visible = this.gridVisible
    this.render()
    return this
  }

  toggleXray () {
    this.xray = !this.xray

    for (const entry of this.meshEntries) {
      entry.surface.material.transparent = this.xray
      entry.surface.material.opacity = this.xray ? 0.38 : 1
      entry.surface.material.needsUpdate = true
    }

    this.render()
    return this
  }

  startDrag (event) {
    this.drag = {
      mode: event.shiftKey ? 'pan' : 'rotate',
      x: event.clientX,
      y: event.clientY
    }
    this.renderer.domElement.setPointerCapture(event.pointerId)
    return this
  }

  dragView (event) {
    if (!this.drag) {
      return this
    }

    const dx = event.clientX - this.drag.x
    const dy = event.clientY - this.drag.y

    this.drag.x = event.clientX
    this.drag.y = event.clientY

    if (this.drag.mode === 'pan') {
      this.pan(dx, dy)
    } else {
      this.state.theta += dx * 0.01
      this.state.phi = clamp(this.state.phi + dy * 0.01, 0.08, Math.PI - 0.08)
    }

    this.render()
    return this
  }

  pan (dx, dy) {
    const amount = this.bounds.size / 420

    this.state.target = [
      this.state.target[0] - dx * amount,
      this.state.target[1],
      this.state.target[2] + dy * amount
    ]
  }

  stopDrag () {
    this.drag = null
    return this
  }

  zoomBy (event) {
    event.preventDefault()
    this.state.radius = clamp(this.state.radius * Math.exp(event.deltaY * 0.001), this.bounds.size * 0.2, this.bounds.size * 20)
    this.render()
    return this
  }

  resize () {
    const { width, height } = viewportSize(this.viewport, this.renderer.domElement)
    const aspect = width / height
    const span = this.state.radius

    this.renderer.setPixelRatio(Math.min(this.window?.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height, false)
    this.perspectiveCamera.aspect = aspect
    this.perspectiveCamera.updateProjectionMatrix()
    this.orthographicCamera.left = -span * aspect / 2
    this.orthographicCamera.right = span * aspect / 2
    this.orthographicCamera.top = span / 2
    this.orthographicCamera.bottom = -span / 2
    this.orthographicCamera.updateProjectionMatrix()
  }

  render () {
    this.resize()
    this.positionCamera()
    this.renderer.render(this.scene, this.camera)
    return this
  }

  positionCamera () {
    const [x, y, z] = cameraPosition(this.state)

    this.camera.position.set(x, y, z)
    this.camera.lookAt(...this.state.target)
  }
}

function createWebGlRenderer (three, options) {
  if (options.renderer) {
    return options.renderer
  }

  return new three.WebGLRenderer({ antialias: true, alpha: true })
}

function setCameraZUp (camera) {
  camera.up.set(0, 0, 1)
}

function createZUpGrid (three, size, bounds) {
  const grid = new three.GridHelper(size, 10, '#cbd5e1', '#e2e8f0')

  grid.rotation.x = Math.PI / 2
  grid.position.set(bounds.center[0], bounds.center[1], 0)
  grid.name = 'solidark-z-up-grid'
  return grid
}

function viewerGridSize (value, bounds) {
  const minimumSize = Number(value ?? 10)
  const requestedSize = Number.isFinite(minimumSize) && minimumSize > 0 ? minimumSize : 10
  const footprintSize = bounds.footprintSize <= requestedSize ? bounds.footprintSize : bounds.footprintSize * 1.1

  return Math.max(requestedSize, footprintSize)
}

function createNamedAxes (three, size) {
  const axes = new three.AxesHelper(size * 0.72)

  setLineWidth(axes.material, 2)
  axes.name = 'solidark-axes-x-red-y-green-z-blue'
  return axes
}

function setLineWidth (material, width) {
  for (const entry of [].concat(material)) {
    entry.linewidth = width
    entry.needsUpdate = true
  }
}

function canCreateWebGlContext (document) {
  try {
    const canvas = document.createElement('canvas')

    return Boolean(canvas.getContext?.('webgl2') || canvas.getContext?.('webgl'))
  } catch {
    return false
  }
}

function createPointerListeners (renderer) {
  return {
    dblclick: () => renderer.fit(),
    pointerdown: (event) => renderer.startDrag(event),
    pointerleave: () => renderer.stopDrag(),
    pointermove: (event) => renderer.dragView(event),
    pointerup: () => renderer.stopDrag(),
    resize: () => renderer.render(),
    wheel: (event) => renderer.zoomBy(event)
  }
}

function createElement (document, tag, className) {
  const element = document.createElement(tag)

  element.className = className
  return element
}

function createButton (document, label, ariaLabel, action) {
  const button = createElement(document, 'button', 'solidark-cad-button')

  button.type = 'button'
  button.textContent = label
  button.setAttribute('aria-label', ariaLabel)
  button.addEventListener('click', action)
  return button
}

function createAxisLegend (document, action) {
  const legend = createElement(document, 'div', 'solidark-cad-axis-legend')

  legend.setAttribute('aria-label', 'Coordinate axes: X is red, Y is green, Z is blue and vertical')
  for (const [axis, color] of AXES) {
    const label = createElement(document, 'span', `solidark-cad-axis-label solidark-cad-axis-${axis}`)

    label.tabIndex = 0
    label.setAttribute('role', 'button')
    label.setAttribute('title', 'Toggle axes')
    label.textContent = axis.toUpperCase()
    label.style.setProperty('--solidark-axis-color', color)
    label.addEventListener('click', action)
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        action()
      }
    })
    legend.appendChild(label)
  }

  return legend
}

function clearTarget (target) {
  if (typeof target.replaceChildren === 'function') {
    target.replaceChildren()
    return
  }

  target.textContent = ''
}

function meshColor (mesh, index) {
  const color = mesh.color ?? mesh.styling?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]

  if (Array.isArray(color)) {
    return `rgb(${color.slice(0, 3).map((value) => Math.round(Number(value) * 255)).join(' ')})`
  }

  return color
}

function meshBounds (meshes) {
  const vertices = meshes.flatMap((mesh) => mesh.vertices)

  if (vertices.length === 0) {
    return { center: [0, 0, 0], footprintSize: 1, size: 1 }
  }

  const min = [0, 1, 2].map((axis) => Math.min(...vertices.map((vertex) => vertex[axis])))
  const max = [0, 1, 2].map((axis) => Math.max(...vertices.map((vertex) => vertex[axis])))
  const spans = max.map((value, axis) => value - min[axis])

  return {
    center: min.map((value, axis) => (value + max[axis]) / 2),
    footprintSize: Math.max(spans[0], spans[1], 1),
    size: Math.max(...spans, 1)
  }
}

function viewportSize (viewport, canvas) {
  const rect = viewport.getBoundingClientRect?.() || {}
  const width = Math.max(1, Math.round(rect.width || canvas.width || 720))
  const height = Math.max(1, Math.round(rect.height || canvas.height || 420))

  return { height, width }
}

function cameraPosition ({ target, radius, theta, phi }) {
  const sinPhi = Math.sin(phi)

  return [
    target[0] + radius * sinPhi * Math.cos(theta),
    target[1] + radius * sinPhi * Math.sin(theta),
    target[2] + radius * Math.cos(phi)
  ]
}

function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}
