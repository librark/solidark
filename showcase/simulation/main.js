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

const cadLinkStyles = Object.freeze({
  base: { color: '#94a3b8', thickness: 60 },
  left_crank: { color: '#3bdc9f', thickness: 60 },
  right_crank: { color: '#bd94fa', thickness: 60 },
  left_coupler: { color: '#57bdf8', thickness: 50 },
  right_coupler: { color: '#fa7d6b', thickness: 50 }
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

export function createCadModelMarkup (state = createFiveBarState(0)) {
  return [
    cadLinkMarkup('base', state.links.base),
    cadLinkMarkup('left_crank', state.links.left_crank),
    cadLinkMarkup('right_crank', state.links.right_crank),
    cadLinkMarkup('left_coupler', state.links.left_coupler),
    cadLinkMarkup('right_coupler', state.links.right_coupler),
    cadEffectorMarkup(state.links.end_effector)
  ].join('\n')
}

export function renderCadModel (model, state = createFiveBarState(0)) {
  model.innerHTML = createCadModelMarkup(state)
  return model
}

export function renderRobotJson (document, robot) {
  const target = document.querySelector('[data-robot-json]')

  target.textContent = JSON.stringify(robot, null, 2)
  return target
}

export function createBabylonFactory (BABYLON, scene) {
  return {
    createLink (link) {
      const mesh = BABYLON.MeshBuilder.CreateBox(link.name, {
        depth: 0.06,
        height: 0.06,
        width: 1
      }, scene)
      const material = new BABYLON.StandardMaterial(`${link.name}-material`, scene)

      material.diffuseColor = colorForLink(BABYLON, link.name)
      material.specularColor = new BABYLON.Color3(0.18, 0.2, 0.24)
      mesh.material = material
      mesh.metadata = { solidark: link }
      return mesh
    },
    updateLink (mesh, transform) {
      mesh.position = new BABYLON.Vector3(...transform.position)
      mesh.rotation.z = transform.rotation
      mesh.scaling.x = transform.length
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
  const cadState = createFiveBarState(0)
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
  renderCadModel(cadModel, cadState)
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

function cadLinkMarkup (name, transform) {
  const style = cadLinkStyles[name]
  const size = [
    formatMillimeters(transform.length),
    style.thickness,
    style.thickness
  ].join(' ')

  return `<sol-translate by="${formatVector(transform.position)}">
  <sol-rotate z="${formatDegrees(transform.rotation)}">
    <sol-color value="${style.color}">
      <sol-cuboid size="${size}"></sol-cuboid>
    </sol-color>
  </sol-rotate>
</sol-translate>`
}

function cadEffectorMarkup (transform) {
  return `<sol-translate by="${formatVector(transform.position)}">
  <sol-color value="#fbbf24">
    <sol-sphere radius="${formatMillimeters(transform.length / 2)}"></sol-sphere>
  </sol-color>
</sol-translate>`
}

function formatVector (vector) {
  return vector.map(formatMillimeters).join(' ')
}

function formatMillimeters (value) {
  return formatNumber(value * 1000)
}

function formatDegrees (radians) {
  return formatNumber(radians * 180 / Math.PI)
}

function formatNumber (value) {
  return String(Number(value.toFixed(3)))
}

function colorForLink (BABYLON, name) {
  const colors = {
    base: [0.68, 0.74, 0.84],
    end_effector: [0.98, 0.72, 0.28],
    left_coupler: [0.34, 0.74, 0.98],
    left_crank: [0.24, 0.86, 0.62],
    right_coupler: [0.98, 0.49, 0.42],
    right_crank: [0.74, 0.58, 0.98]
  }

  return new BABYLON.Color3(...(colors[name] || [0.82, 0.86, 0.92]))
}

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
