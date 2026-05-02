import { SolidarkRuntime } from '../../lib/runtime/index.js'
import { compileRobotDefinition } from '../../lib/robot/index.js'
import { configureShowcaseKernel } from '../kernel.js'
import { ArcRotateCamera } from '../../node_modules/@babylonjs/core/Cameras/arcRotateCamera.js'
import { Engine } from '../../node_modules/@babylonjs/core/Engines/engine.js'
import { HemisphericLight } from '../../node_modules/@babylonjs/core/Lights/hemisphericLight.js'
import { StandardMaterial } from '../../node_modules/@babylonjs/core/Materials/standardMaterial.js'
import { Color3, Color4 } from '../../node_modules/@babylonjs/core/Maths/math.color.js'
import { Quaternion, Vector3 } from '../../node_modules/@babylonjs/core/Maths/math.vector.js'
import { MeshBuilder } from '../../node_modules/@babylonjs/core/Meshes/meshBuilder.js'
import { PhysicsImpostor } from '../../node_modules/@babylonjs/core/Physics/physicsImpostor.js'
import { CannonJSPlugin } from '../../node_modules/@babylonjs/core/Physics/v1/Plugins/cannonJSPlugin.js'
import '../../node_modules/@babylonjs/core/Physics/physicsEngineComponent.js'
import { Scene } from '../../node_modules/@babylonjs/core/scene.js'
import * as CANNON from '../../node_modules/cannon-es/dist/cannon-es.js'

const ImportedBABYLON = Object.freeze({
  ArcRotateCamera,
  Color4,
  Color3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  CannonJSPlugin,
  CANNON,
  PhysicsImpostor,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3
})

const defaultFiveBar = Object.freeze({
  baseWidth: 1.8,
  crankLength: 0.65,
  couplerLength: 0.950488,
  effectorBaseHeight: 1.18,
  effectorTravel: 0.32,
  effectorLength: 0.16,
  leftJoint: 'left_motor',
  rightJoint: 'right_motor'
})

const actuatorStep = Math.PI / 180 * 5

export function createFiveBarState (actuators = {}, options = {}) {
  const config = fiveBarConfiguration(options.robot, options)
  const leftBase = config.leftOrigin
  const rightBase = config.rightOrigin
  const requested = typeof actuators === 'number'
    ? animatedFiveBarActuators(actuators)
    : actuators
  const leftAngle = limitedActuatorValue(requested[config.leftJoint], config.actuators[config.leftJoint])
  const rightAngle = limitedActuatorValue(requested[config.rightJoint], config.actuators[config.rightJoint])
  const leftElbow = pointFromAngle(leftBase, leftAngle, config.crankLength)
  const rightElbow = pointFromAngle(rightBase, rightAngle, config.crankLength)
  const effector = circleIntersection(leftElbow, config.leftCouplerLength, rightElbow, config.rightCouplerLength)

  return {
    joints: {
      [config.leftJoint]: leftAngle,
      [config.rightJoint]: rightAngle
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
        length: config.effectorLength
      }
    }
  }
}

export function createFiveBarRuntime (robot, factory, options = {}) {
  const links = Object.fromEntries(
    robot.links.map((link) => [link.name, factory.createLink(link)])
  )
  const config = fiveBarConfiguration(robot, options)
  const actuators = createActuatorControls(robot, config)
  const actuatorByName = new Map(actuators.map((actuator) => [actuator.name, actuator]))
  const controls = Object.fromEntries(
    actuators.map((actuator) => [actuator.joint, actuator.value])
  )

  return {
    actuators,
    controls,
    links,
    robot,
    adjustActuator (name, delta) {
      const actuator = actuatorByName.get(name)

      return this.setActuator(name, controls[actuator.joint] + delta)
    },
    setActuator (name, value) {
      const actuator = actuatorByName.get(name)
      const limited = clamp(value, actuator.lower, actuator.upper)

      actuator.value = limited
      controls[actuator.joint] = limited
      return limited
    },
    update () {
      const state = createFiveBarState(controls, { ...options, robot })

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

export function createBabylonFactory (BABYLON, scene, options = {}) {
  const physics = options.physics || { enabled: false }

  return {
    createLink (link) {
      const descriptor = simulationDescriptorForLink(link)
      const mesh = createSimulationMesh(BABYLON, scene, link, descriptor)
      const material = new BABYLON.StandardMaterial(`${link.name}-material`, scene)

      material.diffuseColor = colorForLink(BABYLON, link)
      material.specularColor = new BABYLON.Color3(0.18, 0.2, 0.24)
      mesh.material = material
      mesh.metadata = { solidark: link, solidarkSimulation: descriptor }
      attachPhysicsImpostor(BABYLON, scene, mesh, link, descriptor, physics)
      return mesh
    },
    updateLink (mesh, transform) {
      mesh.position = new BABYLON.Vector3(...transform.position)

      if ('Quaternion' in BABYLON && typeof BABYLON.Quaternion.FromEulerAngles === 'function') {
        mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, 0, transform.rotation)
      } else {
        mesh.rotation.z = transform.rotation
      }

      if (mesh.metadata?.solidarkSimulation?.kind !== 'sphere') {
        mesh.scaling.x = transform.length / (mesh.metadata?.solidarkSimulation?.length || 1)
      }

      mesh.physicsImpostor?.forceUpdate?.()
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
  const physics = enableSimulationPhysics(BABYLON, scene)
  const mechanismRuntime = createFiveBarRuntime(robot, createBabylonFactory(BABYLON, scene, { physics }))

  camera.attachControl(canvas, true)
  light.intensity = 0.85
  scene.clearColor = new BABYLON.Color4(0.07, 0.09, 0.14, 1)
  scene.onBeforeRenderObservable.add(() => {
    mechanismRuntime.update()
  })
  renderRobotJson(document, robot)
  const controls = renderActuatorControls(document, mechanismRuntime)
  const keyboardHandler = attachActuatorKeyboardControls(document, mechanismRuntime, controls)

  mechanismRuntime.update()
  scene.render()
  engine.runRenderLoop(() => scene.render())
  const cadResult = await cadViewer.refresh(cadModel, { runtime })

  status.textContent = `Loaded ${robot.links.length} links${physics.enabled ? ' with physics' : ' without physics'}`

  return { cadResult, camera, controls, engine, keyboardHandler, light, physics, robot, robotJson, runtime: mechanismRuntime, scene }
}

export function enableSimulationPhysics (BABYLON, scene) {
  const physics = { enabled: false, errors: [] }

  if (typeof scene.enablePhysics !== 'function' || !BABYLON.CannonJSPlugin || !BABYLON.CANNON) {
    physics.reason = 'physics-plugin-unavailable'
    return physics
  }

  try {
    const plugin = new BABYLON.CannonJSPlugin(true, 10, BABYLON.CANNON)
    const enabled = scene.enablePhysics(new BABYLON.Vector3(0, -9.807, 0), plugin)

    physics.enabled = Boolean(enabled)
    physics.plugin = physics.enabled ? plugin.name : undefined
    physics.reason = physics.enabled ? 'enabled' : 'physics-not-enabled'
  } catch (error) {
    physics.reason = error instanceof Error ? error.message : String(error)
    physics.errors.push(physics.reason)
  }

  return physics
}

export function renderActuatorControls (document, runtime) {
  const target = document.querySelector('[data-actuator-controls]')
  const inputs = new Map()

  target.replaceChildren()

  for (const actuator of runtime.actuators) {
    const label = document.createElement('label')
    const name = document.createElement('span')
    const input = document.createElement('input')
    const output = document.createElement('output')

    label.className = 'actuator-control'
    label.title = `${actuator.name} (${actuator.joint})`
    name.textContent = actuator.name
    input.type = 'range'
    input.min = String(degrees(actuator.lower))
    input.max = String(degrees(actuator.upper))
    input.step = '1'
    input.value = String(degrees(actuator.value))
    output.value = `${formatDegrees(actuator.value)} deg`
    output.textContent = output.value
    input.addEventListener('input', () => {
      runtime.setActuator(actuator.name, radians(Number(input.value)))
      runtime.update()
      syncActuatorControls(inputs, runtime)
    })
    label.append(name, input, output)
    target.appendChild(label)
    inputs.set(actuator.name, { input, output })
  }

  return {
    inputs,
    target,
    sync () {
      syncActuatorControls(inputs, runtime)
    }
  }
}

export function attachActuatorKeyboardControls (document, runtime, controls) {
  const handler = (event) => {
    const command = keyboardActuatorCommand(event.key)

    if (!command || !runtime.actuators[command.index]) {
      return
    }

    event.preventDefault()
    runtime.adjustActuator(runtime.actuators[command.index].name, command.delta)
    runtime.update()
    controls.sync()
  }

  document.addEventListener('keydown', handler)
  return handler
}

function keyboardActuatorCommand (key) {
  const commands = {
    ArrowDown: { index: 1, delta: -actuatorStep },
    ArrowLeft: { index: 0, delta: -actuatorStep },
    ArrowRight: { index: 0, delta: actuatorStep },
    ArrowUp: { index: 1, delta: actuatorStep }
  }

  return commands[key]
}

function syncActuatorControls (inputs, runtime) {
  for (const actuator of runtime.actuators) {
    const control = inputs.get(actuator.name)

    control.input.value = String(degrees(actuator.value))
    control.output.value = `${formatDegrees(actuator.value)} deg`
    control.output.textContent = control.output.value
  }
}

function fiveBarConfiguration (robot, options = {}) {
  const config = { ...defaultFiveBar, ...options }
  const links = new Map((robot?.links || []).map((link) => [link.name, link]))
  const joints = new Map((robot?.joints || []).map((joint) => [joint.name, joint]))
  const leftJoint = joints.get(config.leftJoint)
  const rightJoint = joints.get(config.rightJoint)
  const leftOrigin = leftJoint?.origin || [-config.baseWidth / 2, 0, 0]
  const rightOrigin = rightJoint?.origin || [config.baseWidth / 2, 0, 0]
  const baseWidth = distance(leftOrigin, rightOrigin) || config.baseWidth
  const leftCrank = linkDescriptor(links, 'left_crank')
  const rightCrank = linkDescriptor(links, 'right_crank')
  const leftCoupler = linkDescriptor(links, 'left_coupler')
  const rightCoupler = linkDescriptor(links, 'right_coupler')
  const endEffector = linkDescriptor(links, 'end_effector')
  const actuators = Object.fromEntries(
    createActuatorControls(robot, config).map((actuator) => [actuator.joint, actuator])
  )

  return {
    ...config,
    actuators,
    baseWidth,
    crankLength: leftCrank?.length || rightCrank?.length || config.crankLength,
    effectorLength: endEffector?.diameter || config.effectorLength,
    leftCouplerLength: leftCoupler?.length || config.couplerLength,
    leftOrigin,
    rightCouplerLength: rightCoupler?.length || config.couplerLength,
    rightOrigin
  }
}

function linkDescriptor (links, name) {
  return links.has(name) ? simulationDescriptorForLink(links.get(name)) : null
}

function createActuatorControls (robot, config) {
  const joints = new Map((robot?.joints || []).map((joint) => [joint.name, joint]))
  const actuators = robot?.actuators?.length
    ? robot.actuators
    : [
        { name: 'left_motor_drive', joint: config.leftJoint },
        { name: 'right_motor_drive', joint: config.rightJoint }
      ]

  return actuators.map((actuator) => {
    const joint = joints.get(actuator.joint)
    const limits = actuator.limits || joint?.limits || defaultActuatorLimits(actuator.joint, config)
    const lower = Number(limits.lower ?? -Math.PI)
    const upper = Number(limits.upper ?? Math.PI)
    const value = clamp(Number(actuator.initial ?? (lower + upper) / 2), lower, upper)

    return {
      name: actuator.name,
      joint: actuator.joint,
      kind: actuator.kind || 'servo',
      lower,
      upper,
      value
    }
  })
}

function defaultActuatorLimits (joint, config) {
  return joint === config.rightJoint
    ? { lower: Math.PI - 1.4, upper: Math.PI - 0.4 }
    : { lower: 0.4, upper: 1.4 }
}

function animatedFiveBarActuators (time) {
  return {
    left_motor: 0.9 + Math.sin(time) * 0.5,
    right_motor: Math.PI - 0.9 - Math.sin(time) * 0.5
  }
}

function limitedActuatorValue (value, actuator) {
  return clamp(Number(value ?? actuator.value), actuator.lower, actuator.upper)
}

function pointFromAngle (origin, angle, length) {
  return [
    origin[0] + Math.cos(angle) * length,
    origin[1] + Math.sin(angle) * length,
    origin[2]
  ]
}

function circleIntersection (left, leftRadius, right, rightRadius) {
  const dx = right[0] - left[0]
  const dy = right[1] - left[1]
  const d = Math.sqrt(dx * dx + dy * dy)

  if (d === 0) {
    return [left[0], left[1] + leftRadius, left[2]]
  }

  const x = (leftRadius * leftRadius - rightRadius * rightRadius + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, leftRadius * leftRadius - x * x))
  const px = left[0] + x * dx / d
  const py = left[1] + x * dy / d
  const rx = -dy * h / d
  const ry = dx * h / d
  const candidates = [
    [px + rx, py + ry, left[2]],
    [px - rx, py - ry, left[2]]
  ]

  return candidates[0][1] >= candidates[1][1] ? candidates[0] : candidates[1]
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

function distance (start, end) {
  return segmentTransform(start, end).length
}

function clamp (value, lower, upper) {
  return Math.min(Math.max(value, lower), upper)
}

function radians (value) {
  return value * Math.PI / 180
}

function degrees (value) {
  return value * 180 / Math.PI
}

function formatDegrees (value) {
  return String(Number(degrees(value).toFixed(1)))
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
    width: descriptor.length
  }, scene)
}

function attachPhysicsImpostor (BABYLON, scene, mesh, link, descriptor, physics) {
  const inertial = link.inertial || { mass: 0 }

  mesh.metadata.solidarkInertial = inertial

  if (!physics.enabled || !BABYLON.PhysicsImpostor) {
    return null
  }

  try {
    const impostorType = descriptor.kind === 'sphere'
      ? BABYLON.PhysicsImpostor.SphereImpostor
      : BABYLON.PhysicsImpostor.BoxImpostor

    mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, impostorType, {
      friction: 0.45,
      mass: 0,
      restitution: 0.02
    }, scene)
    return mesh.physicsImpostor
  } catch (error) {
    physics.errors.push(error instanceof Error ? error.message : String(error))
    return null
  }
}

function simulationDescriptorForLink (link) {
  const geometry = link.collisions?.length ? link.collisions : link.visuals
  const primitive = firstPrimitive(geometry)
  const kind = primitive?.tag === 'sol-sphere' ? 'sphere' : 'box'
  const color = firstVisualColor(link.visuals) ?? fallbackColorForName(link.name)

  if (kind === 'sphere') {
    const radius = Number(primitive.properties.radius ?? 0.08)

    return { color, diameter: radius * 2, kind }
  }

  const size = primitive?.properties?.size
  const length = Array.isArray(size) ? Number(size[0] ?? 1) : Number(primitive?.properties?.width ?? primitive?.properties?.length ?? 1)
  const depth = Array.isArray(size) ? Number(size[1] ?? 0.06) : Number(primitive?.properties?.depth ?? 0.06)
  const height = Array.isArray(size) ? Number(size[2] ?? depth) : Number(primitive?.properties?.height ?? depth)

  return { color, depth, height, kind, length }
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
