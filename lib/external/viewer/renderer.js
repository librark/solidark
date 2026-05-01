import { createGlbObjectUrl } from '../../export/index.js'

/**
 * Browser visualization adapter for evaluated Solidark results.
 */
export class Viewer {
  constructor (target = null) {
    this.target = target
    this.result = null
    this.renderer = null
  }

  render (result) {
    this.result = result
    this.disposeRenderer()

    if (this.target) {
      const meshes = result.meshes || []

      if (meshes.length > 0 && canUseModelViewerTarget(this.target)) {
        this.renderer = createModelViewerScene(this.target, meshes)
      } else if (meshes.length > 0 && canUseCanvasTarget(this.target)) {
        this.renderer = createMeshSceneCanvas(this.target, meshes)
      } else {
        renderMarkupTarget(
          this.target,
          meshes.length > 0 ? createMeshSceneSvg(meshes) : createSceneSvg(result.shapes)
        )
      }
    }

    return this
  }

  clear () {
    this.result = null
    this.disposeRenderer()

    if (this.target) {
      clearTarget(this.target)
    }

    return this
  }

  disposeRenderer () {
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }

    return this
  }
}

/**
 * Creates a viewer adapter.
 *
 * @param {{ textContent?: string } | null} target
 * @returns {Viewer}
 */
export function createViewer (target = null) {
  return new Viewer(target)
}

/**
 * Renders OpenCascade mesh output through the <model-viewer> Web Component.
 *
 * @param {HTMLElementLike} target
 * @param {RenderableMesh[]} meshes
 * @param {{ urlApi?: typeof URL }} options
 * @returns {ModelViewerRenderer}
 */
export function createModelViewerScene (target, meshes = [], options = {}) {
  return new ModelViewerRenderer(target, meshes, options)
}

/**
 * <model-viewer> adapter backed by an exported GLB object URL.
 */
export class ModelViewerRenderer {
  constructor (target, meshes = [], options = {}) {
    this.target = target
    this.meshes = meshes
    this.urlApi = options.urlApi || globalThis.URL
    this.object = createGlbObjectUrl(meshes, {}, this.urlApi)
    this.element = createModelViewerElement(target, this.object.url)

    clearTarget(target)
    target.appendChild(this.element)
  }

  dispose () {
    if (this.object) {
      this.urlApi.revokeObjectURL(this.object.url)
      this.object = null
    }

    return this
  }
}

/**
 * Renders OpenCascade mesh output into an interactive canvas.
 *
 * @param {HTMLElementLike} target
 * @param {RenderableMesh[]} meshes
 * @returns {CanvasMeshRenderer}
 */
export function createMeshSceneCanvas (target, meshes = []) {
  const document = target.ownerDocument || globalThis.document
  const canvas = document.createElement('canvas')

  canvas.className = 'solidark-viewer-canvas'
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Interactive Solidark model viewer')
  clearTarget(target)
  target.appendChild(canvas)

  return new CanvasMeshRenderer(canvas, meshes)
}

/**
 * Interactive canvas mesh renderer with orbit, pan, and zoom controls.
 */
export class CanvasMeshRenderer {
  constructor (canvas, meshes = []) {
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.meshes = meshes
    this.camera = defaultCamera()
    this.drag = null
    this.listeners = createCanvasListeners(this)

    this.attach()
    this.draw()
  }

  attach () {
    for (const [event, listener] of Object.entries(this.listeners)) {
      this.canvas.addEventListener(event, listener)
    }

    return this
  }

  dispose () {
    for (const [event, listener] of Object.entries(this.listeners)) {
      this.canvas.removeEventListener(event, listener)
    }

    return this
  }

  reset () {
    this.camera = defaultCamera()
    this.draw()
    return this
  }

  startDrag (event) {
    this.drag = {
      x: event.clientX,
      y: event.clientY,
      mode: event.shiftKey ? 'pan' : 'rotate'
    }
    this.canvas.setPointerCapture(event.pointerId)

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
      this.camera.panX += dx
      this.camera.panY += dy
    } else {
      this.camera.yaw += dx * 0.01
      this.camera.pitch = clamp(this.camera.pitch + dy * 0.01, -1.45, 1.45)
    }

    this.draw()
    return this
  }

  stopDrag () {
    this.drag = null

    return this
  }

  zoomBy (event) {
    event.preventDefault()
    this.camera.zoom = clamp(this.camera.zoom * Math.exp(-event.deltaY * 0.001), 0.18, 8)
    this.draw()

    return this
  }

  draw () {
    const { width, height } = resizeCanvas(this.canvas)
    const triangles = collectCanvasTriangles(this.meshes, this.camera, width, height)

    drawCanvasBackground(this.context, width, height)

    if (triangles.length === 0) {
      drawCanvasEmpty(this.context, width, height)
      return this
    }

    for (const triangle of triangles) {
      drawCanvasTriangle(this.context, triangle)
    }

    return this
  }
}

function canUseCanvasTarget (target) {
  return typeof target.appendChild === 'function' && Boolean(target.ownerDocument || globalThis.document)
}

function canUseModelViewerTarget (target) {
  const registry = customElementsForTarget(target)

  return canUseCanvasTarget(target) &&
    typeof registry?.get === 'function' &&
    Boolean(registry.get('model-viewer')) &&
    typeof Blob !== 'undefined' &&
    Boolean(globalThis.URL?.createObjectURL) &&
    Boolean(globalThis.URL?.revokeObjectURL)
}

function customElementsForTarget (target) {
  return target.ownerDocument?.defaultView?.customElements || globalThis.customElements
}

function createModelViewerElement (target, url) {
  const document = target.ownerDocument || globalThis.document
  const element = document.createElement('model-viewer')

  element.className = 'solidark-model-viewer'
  element.src = url
  element.setAttribute('src', url)
  element.setAttribute('camera-controls', '')
  element.setAttribute('auto-rotate', '')
  element.setAttribute('interaction-prompt', 'none')
  element.setAttribute('shadow-intensity', '0.65')
  element.setAttribute('exposure', '1')
  element.setAttribute('alt', 'Interactive Solidark model viewer')

  return element
}

function createCanvasListeners (renderer) {
  return {
    pointerdown: (event) => renderer.startDrag(event),
    pointermove: (event) => renderer.dragView(event),
    pointerup: () => renderer.stopDrag(),
    pointerleave: () => renderer.stopDrag(),
    wheel: (event) => renderer.zoomBy(event),
    dblclick: () => renderer.reset()
  }
}

function defaultCamera () {
  return {
    yaw: -0.7,
    pitch: -0.55,
    zoom: 1,
    panX: 0,
    panY: 0
  }
}

function clearTarget (target) {
  if (typeof target.replaceChildren === 'function') {
    target.replaceChildren()
    return
  }

  if ('innerHTML' in target) {
    target.innerHTML = ''
  }

  if ('textContent' in target) {
    target.textContent = ''
  }
}

function renderMarkupTarget (target, markup) {
  if ('innerHTML' in target) {
    target.innerHTML = markup
  } else {
    target.textContent = markup
  }
}

function resizeCanvas (canvas) {
  const rect = canvas.getBoundingClientRect()
  const fallbackWidth = Number(canvas.width)
  const fallbackHeight = Number(canvas.height)
  const width = Math.max(1, Math.round(rect.width > 0 ? rect.width : fallbackWidth))
  const height = Math.max(1, Math.round(rect.height > 0 ? rect.height : fallbackHeight))

  canvas.width = width
  canvas.height = height

  return { width, height }
}

function drawCanvasBackground (context, width, height) {
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#e1e7ee'
  context.lineWidth = 1

  for (let offset = 28; offset < Math.max(width, height); offset += 28) {
    context.beginPath()
    context.moveTo(offset, 0)
    context.lineTo(offset, height)
    context.moveTo(0, offset)
    context.lineTo(width, offset)
    context.stroke()
  }
}

function drawCanvasEmpty (context, width, height) {
  context.fillStyle = '#64748b'
  context.font = '16px SFMono-Regular, Consolas, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('No geometry', width / 2, height / 2)
}

function collectCanvasTriangles (meshes, camera, width, height) {
  const bounds = meshBounds(meshes)
  const scale = Math.min(width, height) * 0.76 * camera.zoom / bounds.size
  const triangles = []

  meshes.forEach((mesh, meshIndex) => {
    for (const triangle of mesh.triangles) {
      const vertices = triangle.map((vertexIndex) => mesh.vertices[vertexIndex])
      const rotated = vertices.map((vertex) => rotateVertex(centerVertex(vertex, bounds.center), camera))
      const projected = rotated.map((vertex) => projectCanvasVertex(vertex, camera, scale, width, height))

      triangles.push({
        color: canvasTriangleColor(meshIndex, rotated),
        depth: rotated.reduce((total, vertex) => total + vertex[1], 0) / 3,
        projected
      })
    }
  })

  return triangles.sort((left, right) => left.depth - right.depth)
}

function drawCanvasTriangle (context, triangle) {
  context.beginPath()
  context.moveTo(triangle.projected[0][0], triangle.projected[0][1])
  context.lineTo(triangle.projected[1][0], triangle.projected[1][1])
  context.lineTo(triangle.projected[2][0], triangle.projected[2][1])
  context.closePath()
  context.fillStyle = triangle.color
  context.strokeStyle = '#233241'
  context.lineWidth = 1.25
  context.fill()
  context.stroke()
}

function meshBounds (meshes) {
  const vertices = meshes.flatMap((mesh) => mesh.vertices)

  if (vertices.length === 0) {
    return {
      center: [0, 0, 0],
      size: 1
    }
  }

  const min = [0, 1, 2].map((axis) => Math.min(...vertices.map((vertex) => vertex[axis])))
  const max = [0, 1, 2].map((axis) => Math.max(...vertices.map((vertex) => vertex[axis])))
  const spans = max.map((value, axis) => value - min[axis])

  return {
    center: min.map((value, axis) => (value + max[axis]) / 2),
    size: Math.max(...spans, 1)
  }
}

function centerVertex (vertex, center) {
  return [
    vertex[0] - center[0],
    vertex[1] - center[1],
    vertex[2] - center[2]
  ]
}

function rotateVertex ([x, y, z], camera) {
  const yawCos = Math.cos(camera.yaw)
  const yawSin = Math.sin(camera.yaw)
  const pitchCos = Math.cos(camera.pitch)
  const pitchSin = Math.sin(camera.pitch)
  const yawX = x * yawCos - y * yawSin
  const yawY = x * yawSin + y * yawCos

  return [
    yawX,
    yawY * pitchCos - z * pitchSin,
    yawY * pitchSin + z * pitchCos
  ]
}

function projectCanvasVertex ([x, , z], camera, scale, width, height) {
  return [
    width / 2 + camera.panX + x * scale,
    height / 2 + camera.panY - z * scale
  ]
}

function canvasTriangleColor (meshIndex, vertices) {
  const hue = 178 + ((meshIndex * 41) % 130)
  const lightness = Math.round(100 * triangleLightness(vertices))

  return `hsl(${hue} 52% ${lightness}%)`
}

function triangleLightness (vertices) {
  const normal = normalizeVector(crossProduct(
    subtractVector(vertices[1], vertices[0]),
    subtractVector(vertices[2], vertices[0])
  ))
  const light = normalizeVector([0.35, -0.45, 0.82])
  const amount = Math.abs(dotProduct(normal, light))

  return clamp(0.42 + amount * 0.32, 0.38, 0.78)
}

function subtractVector (left, right) {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  ]
}

function crossProduct (left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ]
}

function normalizeVector (vector) {
  const length = Math.hypot(...vector) || 1

  return vector.map((value) => value / length)
}

function dotProduct (left, right) {
  return left.reduce((total, value, index) => total + value * right[index], 0)
}

function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Renders mesh output as an inspectable projected SVG preview.
 *
 * @param {RenderableMesh[]} meshes
 * @returns {string}
 */
export function createMeshSceneSvg (meshes = []) {
  const entries = collectMeshTriangles(meshes)
  const body = entries.length === 0
    ? '<text x="360" y="210" text-anchor="middle" class="empty">No geometry</text>'
    : drawMeshEntries(entries)

  return `<svg viewBox="0 0 720 420" role="img" aria-label="Solidark mesh preview" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="420" fill="#ffffff"></rect>
  <path d="M80 320H640M120 280H600M160 240H560M200 200H520" stroke="#e1e7ee" stroke-width="1"></path>
  ${body}
</svg>`
}

/**
 * Collects projected triangle entries from renderable mesh objects.
 *
 * @param {RenderableMesh[]} meshes
 * @returns {ProjectedTriangle[]}
 */
export function collectMeshTriangles (meshes = []) {
  const entries = []

  meshes.forEach((mesh, meshIndex) => {
    for (const triangle of mesh.triangles) {
      const vertices = triangle.map((vertexIndex) => mesh.vertices[vertexIndex])
      entries.push({
        meshIndex,
        vertices,
        projected: vertices.map(projectVertex),
        depth: vertices.reduce((total, vertex) => total + vertex[0] + vertex[1] + vertex[2], 0) / 3
      })
    }
  })

  return entries.sort((left, right) => left.depth - right.depth)
}

/**
 * Renders the current descriptor graph as an inspectable isometric SVG preview.
 *
 * @param {DescriptorShape[]} shapes
 * @returns {string}
 */
export function createSceneSvg (shapes = []) {
  const entries = collectPrimitiveEntries(shapes)
  const body = entries.length === 0
    ? '<text x="360" y="210" text-anchor="middle" class="empty">No geometry</text>'
    : entries.map(drawEntry).join('')

  return `<svg viewBox="0 0 720 420" role="img" aria-label="Solidark model preview" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="420" fill="#ffffff"></rect>
  <path d="M80 320H640M120 280H600M160 240H560M200 200H520" stroke="#e1e7ee" stroke-width="1"></path>
  ${body}
</svg>`
}

/**
 * Collects primitive shapes from descriptor output.
 *
 * @param {DescriptorShape[]} shapes
 * @returns {DescriptorShape[]}
 */
export function collectPrimitiveEntries (shapes) {
  const entries = []

  for (const shape of shapes) {
    appendPrimitiveEntry(entries, shape)
  }

  return entries
}

function appendPrimitiveEntry (entries, shape) {
  if (shape.category === 'primitive') {
    entries.push(shape)
  }

  for (const child of shape.children || []) {
    appendPrimitiveEntry(entries, child)
  }
}

function drawEntry (shape, index) {
  const column = index % 4
  const row = Math.floor(index / 4)
  const x = 140 + column * 145 + row * 28
  const y = 270 - row * 62
  const hue = 178 + ((index * 41) % 130)
  const label = shape.tag.replace('sol-', '')

  return `<g transform="translate(${x} ${y})">
    <polygon points="0,-38 42,-62 84,-38 42,-14" fill="hsl(${hue} 54% 74%)" stroke="#233241" stroke-width="2"></polygon>
    <polygon points="0,-38 42,-14 42,46 0,20" fill="hsl(${hue} 48% 58%)" stroke="#233241" stroke-width="2"></polygon>
    <polygon points="84,-38 42,-14 42,46 84,20" fill="hsl(${hue} 44% 48%)" stroke="#233241" stroke-width="2"></polygon>
    <text x="42" y="72" text-anchor="middle">${label}</text>
  </g>`
}

function drawMeshEntries (entries) {
  const bounds = projectedBounds(entries.flatMap((entry) => entry.projected))
  const scale = Math.min(560 / Math.max(bounds.width, 1), 320 / Math.max(bounds.height, 1))

  return entries.map((entry) => drawMeshTriangle(entry, bounds, scale)).join('')
}

function drawMeshTriangle (entry, bounds, scale) {
  const hue = 178 + ((entry.meshIndex * 41) % 130)
  const points = entry.projected
    .map(([x, y]) => [
      360 + (x - bounds.centerX) * scale,
      210 + (y - bounds.centerY) * scale
    ].map((value) => value.toFixed(2)).join(','))
    .join(' ')

  return `<polygon points="${points}" fill="hsl(${hue} 52% 68%)" stroke="#233241" stroke-width="1.5"></polygon>`
}

function projectedBounds (points) {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY
  }
}

function projectVertex ([x, y, z]) {
  return [
    x - y * 0.62,
    -z + (x + y) * 0.32
  ]
}

/**
 * @typedef {object} DescriptorShape
 * @property {string} category
 * @property {string} tag
 * @property {Record<string, unknown>} properties
 * @property {DescriptorShape[]} children
 *
 * @typedef {object} RenderableMesh
 * @property {string} tag
 * @property {number[][]} vertices
 * @property {number[][]} triangles
 *
 * @typedef {object} ProjectedTriangle
 * @property {number} meshIndex
 * @property {number[][]} vertices
 * @property {number[][]} projected
 * @property {number} depth
 */
