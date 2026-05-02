import { SolidarkRuntime } from '../../lib/runtime/index.js'
import { compileRobotDefinition } from '../../lib/robot/index.js'
import { configureShowcaseKernel } from '../kernel.js'
import { ArcRotateCamera } from '../../node_modules/@babylonjs/core/Cameras/arcRotateCamera.js'
import { Engine } from '../../node_modules/@babylonjs/core/Engines/engine.js'
import { HemisphericLight } from '../../node_modules/@babylonjs/core/Lights/hemisphericLight.js'
import { StandardMaterial } from '../../node_modules/@babylonjs/core/Materials/standardMaterial.js'
import { Color3, Color4 } from '../../node_modules/@babylonjs/core/Maths/math.color.js'
import { Vector3 } from '../../node_modules/@babylonjs/core/Maths/math.vector.js'
import { MeshBuilder } from '../../node_modules/@babylonjs/core/Meshes/meshBuilder.js'
import { Scene } from '../../node_modules/@babylonjs/core/scene.js'

const ImportedBABYLON = Object.freeze({
  ArcRotateCamera,
  Color4,
  Color3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
})

const defaultFiveBar = Object.freeze({
  baseWidth: 1.8,
  crankLength: 0.65,
  effectorBaseHeight: 1.18,
  effectorTravel: 0.32
})

export function createFiveBarState (time, options = {}) {
  const config = { ...defaultFiveBar, ...options }
  const leftBase = [-config.baseWidth / 2, 0, 0]
  const rightBase = [config.baseWidth / 2, 0, 0]
  const leftAngle = 0.9 + Math.sin(time) * 0.5
  const rightAngle = Math.PI - 0.9 - Math.sin(time) * 0.5
  const leftElbow = pointFromAngle(leftBase, leftAngle, config.crankLength)
  const rightElbow = pointFromAngle(rightBase, rightAngle, config.crankLength)
  const effector = [
    Math.sin(time * 0.8) * config.effectorTravel,
    config.effectorBaseHeight + Math.cos(time * 0.6) * 0.14,
    0
  ]

  return {
    joints: {
      left_motor: leftAngle,
      right_motor: rightAngle
    },
    links: {
      base: segmentTransform(leftBase, rightBase),
      left_crank: segmentTransform(leftBase, leftElbow),
      right_crank: segmentTransform(rightBase, rightElbow),
      left_coupler: segmentTransform(leftElbow, effector),
      right_coupler: segmentTransform(rightElbow, effector),
      end_effector: {
        position: effector,
        rotation: 0,
        length: 0.16
      }
    }
  }
}

export function createFiveBarRuntime (robot, factory, options = {}) {
  const links = Object.fromEntries(
    robot.links.map((link) => [link.name, factory.createLink(link)])
  )

  return {
    links,
    robot,
    update (time) {
      const state = createFiveBarState(time, options)

      for (const [name, transform] of Object.entries(state.links)) {
        factory.updateLink(links[name], transform)
      }

      return state
    }
  }
}

export function renderRobotJson (document, robot) {
  const target = document.querySelector('[data-robot-json]')

  target.textContent = JSON.stringify(robot, null, 2)
  return target
}

export function createBabylonFactory (BABYLON, scene) {
  return {
    createLink (link) {
      const descriptor = simulationDescriptorForLink(link)
      const mesh = createSimulationMesh(BABYLON, scene, link, descriptor)
      const material = new BABYLON.StandardMaterial(`${link.name}-material`, scene)

      material.diffuseColor = colorForLink(BABYLON, link)
      material.specularColor = new BABYLON.Color3(0.18, 0.2, 0.24)
      mesh.material = material
      mesh.metadata = { solidark: link, solidarkSimulation: descriptor }
      return mesh
    },
    updateLink (mesh, transform) {
      mesh.position = new BABYLON.Vector3(...transform.position)
      mesh.rotation.z = transform.rotation

      if (mesh.metadata?.solidarkSimulation?.kind !== 'sphere') {
        mesh.scaling.x = transform.length
      }
    }
  }
}

export async function bootSimulation ({
  BABYLON = ImportedBABYLON,
  configureKernel = configureShowcaseKernel,
  document = globalThis.document,
  loadElements = loadSolidarkElements,
  runtime = SolidarkRuntime
} = {}) {
  configureKernel({ runtime })
  await loadElements()

  const canvas = document.querySelector('#simulation-canvas')
  const status = document.querySelector('[data-status]')
  const robotElement = document.querySelector('sol-robot')
  const robotJson = document.querySelector('[data-robot-json]')
  const cadModel = document.querySelector('#five-bar-geometry')
  const cadViewer = document.querySelector('[data-robot-viewer]')
  const robot = await compileRobotDefinition(robotElement)
  const engine = new BABYLON.Engine(canvas, true)
  const scene = new BABYLON.Scene(engine)
  const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2, 4.2, new BABYLON.Vector3(0, 0.55, 0), scene)
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
  const mechanismRuntime = createFiveBarRuntime(robot, createBabylonFactory(BABYLON, scene))
  let time = 0

  camera.attachControl(canvas, true)
  light.intensity = 0.85
  scene.clearColor = new BABYLON.Color4(0.07, 0.09, 0.14, 1)
  scene.onBeforeRenderObservable.add(() => {
    time += 1 / 60
    mechanismRuntime.update(time)
  })
  renderRobotJson(document, robot)
  mechanismRuntime.update(time)
  scene.render()
  engine.runRenderLoop(() => scene.render())
  const cadResult = await cadViewer.refresh(cadModel, { runtime })

  status.textContent = `Loaded ${robot.links.length} links`

  return { cadResult, camera, engine, light, robot, robotJson, runtime: mechanismRuntime, scene }
}

function pointFromAngle (origin, angle, length) {
  return [
    origin[0] + Math.cos(angle) * length,
    origin[1] + Math.sin(angle) * length,
    origin[2]
  ]
}

function segmentTransform (start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]

  return {
    position: [
      start[0] + dx / 2,
      start[1] + dy / 2,
      start[2]
    ],
    rotation: Math.atan2(dy, dx),
    length: Math.sqrt(dx * dx + dy * dy)
  }
}

function createSimulationMesh (BABYLON, scene, link, descriptor) {
  if (descriptor.kind === 'sphere') {
    return BABYLON.MeshBuilder.CreateSphere(link.name, {
      diameter: descriptor.diameter
    }, scene)
  }

  return BABYLON.MeshBuilder.CreateBox(link.name, {
    depth: descriptor.depth,
    height: descriptor.height,
    width: 1
  }, scene)
}

function simulationDescriptorForLink (link) {
  const primitive = firstPrimitive(link.visuals)
  const kind = primitive?.tag === 'sol-sphere' ? 'sphere' : 'box'
  const color = firstVisualColor(link.visuals) ?? fallbackColorForName(link.name)

  if (kind === 'sphere') {
    const radius = Number(primitive.properties.radius ?? 0.08)

    return { color, diameter: radius * 2, kind }
  }

  const size = primitive?.properties?.size
  const depth = Array.isArray(size) ? Number(size[1] ?? 0.06) : Number(primitive?.properties?.depth ?? 0.06)
  const height = Array.isArray(size) ? Number(size[2] ?? depth) : Number(primitive?.properties?.height ?? depth)

  return { color, depth, height, kind }
}

function firstPrimitive (descriptors = []) {
  for (const descriptor of descriptors) {
    if (['sol-cuboid', 'sol-sphere'].includes(descriptor.tag)) {
      return descriptor
    }

    const child = firstPrimitive(descriptor.children || [])

    if (child) {
      return child
    }
  }

  return null
}

function firstVisualColor (descriptors = []) {
  for (const descriptor of descriptors) {
    const properties = descriptor.properties || {}
    const color = properties.color ??
      properties.colour ??
      (descriptor.tag === 'sol-color' ? properties.value : undefined)

    if (color !== undefined) {
      return color
    }

    const childColor = firstVisualColor(descriptor.children || [])

    if (childColor !== undefined) {
      return childColor
    }
  }

  return undefined
}

function colorForLink (BABYLON, link) {
  return new BABYLON.Color3(...colorVector(simulationDescriptorForLink(link).color))
}

function fallbackColorForName (name) {
  const colors = {
    base: [0.68, 0.74, 0.84],
    end_effector: [0.98, 0.72, 0.28],
    left_coupler: [0.34, 0.74, 0.98],
    left_crank: [0.24, 0.86, 0.62],
    right_coupler: [0.98, 0.49, 0.42],
    right_crank: [0.74, 0.58, 0.98]
  }

  return colors[name] || [0.82, 0.86, 0.92]
}

function colorVector (value) {
  if (Array.isArray(value)) {
    return normalizeColorVector(value)
  }

  if (typeof value === 'string') {
    return colorStringVector(value)
  }

  return [0.82, 0.86, 0.92]
}

function normalizeColorVector (value) {
  const vector = value.slice(0, 3).map(Number)
  const scale = vector.some((entry) => entry > 1) ? 255 : 1

  return vector.map((entry) => entry / scale)
}

function colorStringVector (value) {
  const color = value.trim().toLowerCase()
  const named = namedColors[color]

  if (named) {
    return named
  }

  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)

  if (hex) {
    return hexColorVector(hex[1])
  }

  return [0.82, 0.86, 0.92]
}

function hexColorVector (hex) {
  const normalized = hex.length === 3
    ? hex.split('').map((entry) => `${entry}${entry}`).join('')
    : hex.slice(0, 6)

  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255)
}

const namedColors = Object.freeze({
  black: [0, 0, 0],
  blue: [0, 0, 1],
  cyan: [0, 1, 1],
  gray: [0.5, 0.5, 0.5],
  green: [0, 0.5, 0],
  grey: [0.5, 0.5, 0.5],
  lime: [0, 1, 0],
  magenta: [1, 0, 1],
  orange: [1, 0.647, 0],
  pink: [1, 0.753, 0.796],
  purple: [0.5, 0, 0.5],
  red: [1, 0, 0],
  white: [1, 1, 1],
  yellow: [1, 1, 0]
})

export async function loadSolidarkElements () {
  const { defineSolidarkElements } = await import('../../lib/elements.js')

  return defineSolidarkElements()
}

/* node:coverage ignore next 11 */
if (globalThis.document?.body?.hasAttribute('data-solidark-simulation')) {
  bootSimulation().catch((error) => {
    const status = globalThis.document.querySelector('[data-status]')

    if (status) {
      status.textContent = error instanceof Error ? error.message : String(error)
    }

    globalThis.console.error(error)
  })
}
