import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../../lib/dom.js'
import {
  bootSimulation,
  createBabylonFactory,
  createFiveBarRuntime,
  createFiveBarState,
  loadSolidarkElements,
  renderRobotJson
} from './main.js'

it('createFiveBarState creates deterministic link transforms', () => {
  const state = createFiveBarState(0, {
    baseWidth: 2,
    crankLength: 0.5,
    effectorBaseHeight: 1,
    effectorTravel: 0.25
  })

  assert.equal(Object.keys(state.links).length, 6)
  assert.equal(state.links.base.length, 2)
  assert.deepEqual(state.links.base.position, [0, 0, 0])
  assert.equal(state.links.left_crank.length, 0.5)
  assert.equal(state.links.end_effector.position[0], 0)
  assert.equal(state.joints.left_motor, 0.9)
  assert.equal(state.joints.right_motor, Math.PI - 0.9)
})

it('createFiveBarRuntime delegates link creation and updates', () => {
  const created = []
  const updated = []
  const robot = {
    links: [
      { name: 'base' },
      { name: 'left_crank' },
      { name: 'right_crank' },
      { name: 'left_coupler' },
      { name: 'right_coupler' },
      { name: 'end_effector' }
    ]
  }
  const runtime = createFiveBarRuntime(robot, {
    createLink (link) {
      created.push(link.name)
      return { name: link.name }
    },
    updateLink (link, transform) {
      updated.push([link.name, transform.length])
    }
  }, { baseWidth: 2 })
  const state = runtime.update(0.25)

  assert.deepEqual(created, robot.links.map((link) => link.name))
  assert.equal(updated.length, 6)
  assert.equal(runtime.robot, robot)
  assert.equal(runtime.links.base.name, 'base')
  assert.equal(state.links.base.length, 2)
})

it('createBabylonFactory maps robot links to Babylon-like meshes', () => {
  const scene = {}
  const BABYLON = {
    Color3: class Color3 {
      constructor (r, g, b) {
        Object.assign(this, { b, g, r })
      }
    },
    MeshBuilder: {
      CreateBox (name, options, targetScene) {
        return {
          kind: 'box',
          name,
          options,
          scene: targetScene,
          rotation: {},
          scaling: {}
        }
      },
      CreateSphere (name, options, targetScene) {
        return {
          kind: 'sphere',
          name,
          options,
          scene: targetScene,
          rotation: {},
          scaling: {}
        }
      }
    },
    StandardMaterial: class StandardMaterial {
      constructor (name, targetScene) {
        this.name = name
        this.scene = targetScene
      }
    },
    Vector3: class Vector3 {
      constructor (x, y, z) {
        this.x = x
        this.y = y
        this.z = z
      }
    }
  }
  const factory = createBabylonFactory(BABYLON, scene)
  const mesh = factory.createLink({ name: 'left_crank' })
  const fallbackMesh = factory.createLink({ name: 'unknown_link' })
  const styledMesh = factory.createLink({
    name: 'base',
    visuals: [{
      tag: 'sol-translate',
      properties: {},
      children: [{
        tag: 'sol-color',
        properties: { value: 'yellow' },
        children: [{
          tag: 'sol-cuboid',
          properties: { size: [1.8, 0.08, 0.04] },
          children: []
        }]
      }]
    }]
  })
  const hexMesh = factory.createLink({
    name: 'hex',
    visuals: [{
      tag: 'sol-cuboid',
      properties: { color: '#369', size: [1, 0.02, 0.03] },
      children: []
    }]
  })
  const vectorMesh = factory.createLink({
    name: 'vector',
    visuals: [{
      tag: 'sol-cuboid',
      properties: { colour: [255, 128, 0], size: [1, 0.04] },
      children: []
    }]
  })
  const invalidMesh = factory.createLink({
    name: 'invalid',
    visuals: [{
      tag: 'sol-cuboid',
      properties: { color: 'not-a-color', depth: 0.07, height: 0.08 },
      children: []
    }]
  })
  const numericColorMesh = factory.createLink({
    name: 'numeric',
    visuals: [{
      tag: 'sol-cuboid',
      properties: { color: 42 },
      children: []
    }]
  })
  const normalizedVectorMesh = factory.createLink({
    name: 'normalized-vector',
    visuals: [{
      tag: 'sol-cuboid',
      properties: { colour: [0.2, 0.3, 0.4], size: [1] },
      children: []
    }]
  })
  const wrappedDefaultMesh = factory.createLink({
    name: 'wrapped-default',
    visuals: [{
      tag: 'sol-translate'
    }]
  })
  const sphereMesh = factory.createLink({
    name: 'end_effector',
    visuals: [{
      tag: 'sol-color',
      properties: { value: '#abcdef' },
      children: [{
        tag: 'sol-sphere',
        properties: { radius: 0.09 },
        children: []
      }]
    }]
  })
  const defaultSphereMesh = factory.createLink({
    name: 'default_sphere',
    visuals: [{
      tag: 'sol-sphere',
      properties: {},
      children: []
    }]
  })
  const externalMesh = { rotation: {}, scaling: {} }

  factory.updateLink(mesh, {
    position: [1, 2, 3],
    rotation: 0.5,
    length: 0.75
  })
  factory.updateLink(sphereMesh, {
    position: [4, 5, 6],
    rotation: 1,
    length: 0.5
  })
  factory.updateLink(externalMesh, {
    position: [7, 8, 9],
    rotation: 1.5,
    length: 0.25
  })

  assert.equal(mesh.name, 'left_crank')
  assert.equal(mesh.kind, 'box')
  assert.equal(mesh.scene, scene)
  assert.deepEqual(mesh.options, { depth: 0.06, height: 0.06, width: 1 })
  assert.equal(mesh.material.name, 'left_crank-material')
  assert.equal(mesh.material.diffuseColor.r, 0.24)
  assert.equal(mesh.material.diffuseColor.g, 0.86)
  assert.equal(mesh.material.diffuseColor.b, 0.62)
  assert.equal(fallbackMesh.material.diffuseColor.r, 0.82)
  assert.equal(fallbackMesh.material.diffuseColor.g, 0.86)
  assert.equal(fallbackMesh.material.diffuseColor.b, 0.92)
  assert.deepEqual(styledMesh.options, { depth: 0.08, height: 0.04, width: 1 })
  assert.equal(styledMesh.material.diffuseColor.r, 1)
  assert.equal(styledMesh.material.diffuseColor.g, 1)
  assert.equal(styledMesh.material.diffuseColor.b, 0)
  assert.equal(hexMesh.material.diffuseColor.r, 0.2)
  assert.equal(hexMesh.material.diffuseColor.g, 0.4)
  assert.equal(hexMesh.material.diffuseColor.b, 0.6)
  assert.deepEqual(vectorMesh.options, { depth: 0.04, height: 0.04, width: 1 })
  assert.equal(Math.round(vectorMesh.material.diffuseColor.g * 1000) / 1000, 0.502)
  assert.equal(invalidMesh.material.diffuseColor.r, 0.82)
  assert.deepEqual(invalidMesh.options, { depth: 0.07, height: 0.08, width: 1 })
  assert.equal(numericColorMesh.material.diffuseColor.r, 0.82)
  assert.deepEqual(normalizedVectorMesh.options, { depth: 0.06, height: 0.06, width: 1 })
  assert.equal(normalizedVectorMesh.material.diffuseColor.r, 0.2)
  assert.equal(normalizedVectorMesh.material.diffuseColor.g, 0.3)
  assert.equal(normalizedVectorMesh.material.diffuseColor.b, 0.4)
  assert.deepEqual(wrappedDefaultMesh.options, { depth: 0.06, height: 0.06, width: 1 })
  assert.equal(sphereMesh.kind, 'sphere')
  assert.deepEqual(sphereMesh.options, { diameter: 0.18 })
  assert.equal(defaultSphereMesh.kind, 'sphere')
  assert.deepEqual(defaultSphereMesh.options, { diameter: 0.16 })
  assert.equal(Math.round(sphereMesh.material.diffuseColor.r * 1000) / 1000, 0.671)
  assert.equal(Math.round(sphereMesh.material.diffuseColor.g * 1000) / 1000, 0.804)
  assert.equal(Math.round(sphereMesh.material.diffuseColor.b * 1000) / 1000, 0.937)
  assert.equal(sphereMesh.scaling.x, undefined)
  assert.equal(externalMesh.position.x, 7)
  assert.equal(externalMesh.scaling.x, 0.25)
  assert.equal(sphereMesh.position.x, 4)
  assert.equal(mesh.position.x, 1)
  assert.equal(mesh.position.y, 2)
  assert.equal(mesh.position.z, 3)
  assert.equal(mesh.rotation.z, 0.5)
  assert.equal(mesh.scaling.x, 0.75)
})

it('bootSimulation compiles the robot and starts a Babylon-like render loop', async () => {
  const [robotElement] = parseMarkup(`
    <sol-robot name="five-bar">
      <sol-robot-link name="base"></sol-robot-link>
      <sol-robot-link name="left_crank"></sol-robot-link>
      <sol-robot-link name="right_crank"></sol-robot-link>
      <sol-robot-link name="left_coupler"></sol-robot-link>
      <sol-robot-link name="right_coupler"></sol-robot-link>
      <sol-robot-link name="end_effector"></sol-robot-link>
    </sol-robot>
  `)
  const status = { textContent: '' }
  const canvas = {}
  const cadModel = { innerHTML: '' }
  const robotJson = { textContent: '' }
  const refreshed = []
  const cadViewer = {
    async refresh (target, options) {
      refreshed.push([target, options.runtime])
      return { target }
    }
  }
  const document = {
    querySelector (selector) {
      return {
        '#simulation-canvas': canvas,
        '#five-bar-geometry': cadModel,
        '[data-status]': status,
        '[data-robot-json]': robotJson,
        '[data-robot-viewer]': cadViewer,
        'sol-robot': robotElement
      }[selector]
    }
  }
  const BABYLON = fakeBabylon()
  const runtime = {}
  const result = await bootSimulation({
    BABYLON,
    configureKernel ({ runtime: configuredRuntime }) {
      assert.equal(configuredRuntime, runtime)
    },
    document,
    loadElements: async () => [],
    runtime
  })

  assert.equal(result.robot.name, 'five-bar')
  assert.equal(result.robot.links.length, 6)
  assert.equal(JSON.parse(robotJson.textContent).name, 'five-bar')
  assert.deepEqual(refreshed, [[cadModel, runtime]])
  assert.equal(result.cadResult.target, cadModel)
  assert.equal(status.textContent, 'Loaded 6 links')
  assert.equal(result.scene.rendered, 2)
  assert.equal(result.camera.attachedCanvas, canvas)
  assert.equal(result.light.intensity, 0.85)
})

it('renderRobotJson writes the generated robot JSON structure into the page', () => {
  const target = { textContent: '' }
  const document = {
    querySelector (selector) {
      assert.equal(selector, '[data-robot-json]')
      return target
    }
  }
  const robot = { schema: 'solidark.robot.v1', name: 'demo', links: [] }

  assert.equal(renderRobotJson(document, robot), target)
  assert.deepEqual(JSON.parse(target.textContent), robot)
})

it('loadSolidarkElements imports the Solidark viewer and modeling elements', async () => {
  const elements = await loadSolidarkElements()

  assert.equal(elements.some((ElementClass) => ElementClass.tag === 'sol-viewer'), true)
  assert.equal(elements.some((ElementClass) => ElementClass.tag === 'sol-model'), true)
})

function fakeBabylon () {
  return {
    ArcRotateCamera: class ArcRotateCamera {
      constructor (name, alpha, beta, radius, target, scene) {
        Object.assign(this, { alpha, beta, name, radius, scene, target })
      }

      attachControl (canvas, enabled) {
        this.attachedCanvas = canvas
        this.controlEnabled = enabled
      }
    },
    Color4: class Color4 {
      constructor (r, g, b, a) {
        Object.assign(this, { a, b, g, r })
      }
    },
    Color3: class Color3 {
      constructor (r, g, b) {
        Object.assign(this, { b, g, r })
      }
    },
    Engine: class Engine {
      constructor (canvas, antialias) {
        Object.assign(this, { antialias, canvas })
      }

      runRenderLoop (callback) {
        callback()
      }
    },
    HemisphericLight: class HemisphericLight {
      constructor (name, direction, scene) {
        Object.assign(this, { direction, name, scene })
      }
    },
    MeshBuilder: {
      CreateBox (name) {
        return {
          name,
          rotation: {},
          scaling: {}
        }
      },
      CreateSphere (name) {
        return {
          name,
          rotation: {},
          scaling: {}
        }
      }
    },
    StandardMaterial: class StandardMaterial {
      constructor (name, scene) {
        Object.assign(this, { name, scene })
      }
    },
    Scene: class Scene {
      constructor (engine) {
        this.engine = engine
        this.onBeforeRenderObservable = {
          add: (callback) => { this.beforeRender = callback }
        }
      }

      render () {
        this.beforeRender()
        this.rendered = (this.rendered || 0) + 1
      }
    },
    Vector3: class Vector3 {
      constructor (x, y, z) {
        Object.assign(this, { x, y, z })
      }
    }
  }
}
