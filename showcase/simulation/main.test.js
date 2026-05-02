import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../../lib/dom.js'
import {
  attachActuatorKeyboardControls,
  bootSimulation,
  createBabylonFactory,
  createFiveBarRuntime,
  createFiveBarState,
  enableSimulationPhysics,
  FiveBarKinematicsError,
  loadSolidarkElements,
  renderActuatorControls,
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
  assertNearlyEqual(state.links.left_coupler.length, 0.950488)
  assertNearlyEqual(state.links.right_coupler.length, 0.950488)
  assert.equal(createFiveBarState({
    left_motor: 0,
    right_motor: Math.PI
  }, {
    baseWidth: 2,
    couplerLength: 0.8,
    crankLength: 0.5,
    robot: openLimitRobot({
      joints: [
        { name: 'left_motor', origin: [0, 0, 0] },
        { name: 'right_motor', origin: [0, 0, 0] }
      ]
    })
  }).links.base.length, 0)
})

it('createFiveBarState rejects poses that would stretch links or hit singularities', () => {
  const robot = openLimitRobot()

  assert.equal(FiveBarKinematicsError.prototype instanceof RangeError, true)
  assert.throws(
    () => createFiveBarState({ left_motor: 0, right_motor: 0 }, { baseWidth: 2, couplerLength: 0.8, crankLength: 0.5, robot }),
    (error) => error.name === 'FiveBarKinematicsError' && error.code === 'unreachable'
  )
  assert.throws(
    () => createFiveBarState({ left_motor: 0, right_motor: Math.PI }, { baseWidth: 2, couplerLength: 0.5, crankLength: 0.5, robot }),
    (error) => error.name === 'FiveBarKinematicsError' && error.code === 'singularity'
  )
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
  const limited = runtime.setActuator('left_motor_drive', 99)
  const adjusted = runtime.adjustActuator('left_motor_drive', -0.5)
  const state = runtime.update()

  assert.deepEqual(created, robot.links.map((link) => link.name))
  assert.equal(updated.length, 6)
  assert.equal(runtime.robot, robot)
  assert.equal(runtime.links.base.name, 'base')
  assert.equal(state.links.base.length, 2)
  assert.equal(limited, 1.4)
  assert.equal(adjusted, 0.8999999999999999)
  assert.equal(runtime.controls.left_motor, 0.8999999999999999)
})

it('createFiveBarRuntime blocks invalid actuator commands before applying them', () => {
  const updated = []
  const robot = {
    links: [
      { name: 'base' },
      { name: 'left_crank' },
      { name: 'right_crank' },
      { name: 'left_coupler' },
      { name: 'right_coupler' },
      { name: 'end_effector' }
    ],
    actuators: [{
      name: 'left_motor_drive',
      joint: 'left_motor',
      limits: { lower: -Math.PI, upper: Math.PI },
      initial: 0.9
    }, {
      name: 'right_motor_drive',
      joint: 'right_motor',
      limits: { lower: -Math.PI, upper: Math.PI },
      initial: Math.PI - 0.9
    }]
  }
  const runtime = createFiveBarRuntime(robot, {
    createLink (link) {
      return { name: link.name }
    },
    updateLink (link, transform) {
      updated.push([link.name, transform.length])
    }
  }, { baseWidth: 2, couplerLength: 0.8, crankLength: 0.5 })
  const previousRight = runtime.controls.right_motor

  assert.equal(runtime.setActuator('left_motor_drive', 0), 0)
  assert.equal(runtime.setActuator('right_motor_drive', 0), previousRight)
  assert.equal(runtime.controls.right_motor, previousRight)
  assert.equal(runtime.blocked.code, 'singularity')
  assert.equal(runtime.update().joints.right_motor, previousRight)
  assert.equal(updated.length, 6)
  runtime.controls.right_motor = 0
  assert.equal(runtime.update().joints.right_motor, previousRight)
  assert.equal(runtime.blocked.code, 'singularity')
  assert.equal(updated.length, 6)
})

it('createFiveBarState derives kinematics from robot geometry and actuator metadata', () => {
  const robot = {
    links: [{
      name: 'right_crank',
      visuals: [{
        tag: 'sol-cuboid',
        properties: { size: [0.7, 0.05, 0.05] },
        children: []
      }]
    }, {
      name: 'left_coupler',
      visuals: [{
        tag: 'sol-cuboid',
        properties: { size: [0.8, 0.04, 0.04] },
        children: []
      }]
    }, {
      name: 'right_coupler',
      visuals: [{
        tag: 'sol-cuboid',
        properties: { size: [0.8, 0.04, 0.04] },
        children: []
      }]
    }],
    joints: [{
      name: 'left_motor',
      type: 'revolute',
      origin: [-1, 0, 0],
      limits: { lower: 0.5, upper: 1 }
    }, {
      name: 'right_motor',
      type: 'revolute',
      origin: [1, 0, 0],
      limits: { lower: 2, upper: 2.5 }
    }],
    actuators: [{
      name: 'left_drive',
      joint: 'left_motor',
      limits: { lower: 0.6, upper: 0.8 },
      initial: 0.7
    }, {
      name: 'right_drive',
      joint: 'right_motor'
    }]
  }
  const state = createFiveBarState({}, { robot })

  assert.equal(state.links.base.length, 2)
  assert.equal(Math.round(state.links.left_crank.length * 1000) / 1000, 0.7)
  assert.equal(state.joints.left_motor, 0.7)
  assert.equal(state.joints.right_motor, 2.25)
  assert.equal(createFiveBarRuntime({
    links: [],
    joints: [],
    actuators: [{ name: 'left_motor_drive', joint: 'left_motor', limits: {}, initial: 0.9 }]
  }, {
    createLink (link) {
      return { name: link.name }
    },
    updateLink () {}
  }).actuators[0].lower, -Math.PI)
  assert.equal(createFiveBarRuntime({
    links: [],
    joints: [],
    actuators: [{ name: 'right_motor_drive', joint: 'right_motor', limits: {}, initial: Math.PI - 0.9 }]
  }, {
    createLink (link) {
      return { name: link.name }
    },
    updateLink () {}
  }).actuators[0].upper, Math.PI)
  assert.equal(createFiveBarState({
    left_motor: 0.7,
    right_motor: 2.25
  }, {
    robot: {
      links: robot.links,
      joints: [
        { name: 'left_motor', origin: [0.3, 0, 0] },
        { name: 'right_motor', origin: [-0.3, 0, 0] }
      ],
      actuators: robot.actuators
    }
  }).links.end_effector.position[1] < 0, false)
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
  const quaternionFactory = createBabylonFactory({
    ...BABYLON,
    Quaternion: {
      FromEulerAngles (x, y, z) {
        return { x, y, z }
      }
    }
  }, scene)
  const physicsFactory = createBabylonFactory({
    ...BABYLON,
    PhysicsImpostor: class PhysicsImpostor {
      static BoxImpostor = 'box'
      static SphereImpostor = 'sphere'

      constructor (mesh, type, options, scene) {
        Object.assign(this, { mesh, options, scene, type })
      }
    }
  }, scene, { physics: { enabled: true, errors: [] } })
  const throwingPhysics = { enabled: true, errors: [] }
  const stringPhysics = { enabled: true, errors: [] }
  const throwingFactory = createBabylonFactory({
    ...BABYLON,
    PhysicsImpostor: class PhysicsImpostor {
      static BoxImpostor = 'box'

      constructor () {
        throw new Error('physics failed')
      }
    }
  }, scene, { physics: throwingPhysics })
  const stringThrowingFactory = createBabylonFactory({
    ...BABYLON,
    PhysicsImpostor: class PhysicsImpostor {
      static BoxImpostor = 'box'

      constructor () {
        throwValue('physics string')
      }
    }
  }, scene, { physics: stringPhysics })
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
  const physicsMesh = physicsFactory.createLink({
    name: 'physics_box',
    inertial: { mass: 2.5 },
    visuals: [{
      tag: 'sol-cuboid',
      properties: { size: [0.4, 0.05, 0.06] },
      children: []
    }]
  })
  const physicsSphereMesh = physicsFactory.createLink({
    name: 'physics_sphere',
    visuals: [{
      tag: 'sol-sphere',
      properties: { radius: 0.1 },
      children: []
    }]
  })
  const collisionMesh = factory.createLink({
    name: 'collision',
    visuals: [{
      tag: 'sol-color',
      properties: { value: 'red' },
      children: []
    }],
    collisions: [{
      tag: 'sol-cuboid',
      properties: { depth: 0.07, length: 0.5 },
      children: []
    }]
  })
  const emptySizeMesh = factory.createLink({
    name: 'empty_size',
    visuals: [{
      tag: 'sol-cuboid',
      properties: { size: [] },
      children: []
    }]
  })
  const failedPhysicsMesh = throwingFactory.createLink({
    name: 'failed_physics',
    visuals: [{
      tag: 'sol-cuboid',
      properties: {},
      children: []
    }]
  })
  stringThrowingFactory.createLink({
    name: 'string_failed_physics',
    visuals: [{
      tag: 'sol-cuboid',
      properties: {},
      children: []
    }]
  })
  const externalMesh = { rotation: {}, scaling: {} }
  const quaternionMesh = quaternionFactory.createLink({
    name: 'quaternion',
    visuals: [{
      tag: 'sol-cuboid',
      properties: {},
      children: []
    }]
  })

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
  quaternionFactory.updateLink(quaternionMesh, {
    position: [0, 0, 0],
    rotation: 0.75,
    length: 0.5
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
  assert.deepEqual(styledMesh.options, { depth: 0.08, height: 0.04, width: 1.8 })
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
  assert.equal(physicsMesh.physicsImpostor.type, 'box')
  assert.equal(physicsMesh.metadata.solidarkInertial.mass, 2.5)
  assert.equal(physicsSphereMesh.physicsImpostor.type, 'sphere')
  assert.deepEqual(collisionMesh.options, { depth: 0.07, height: 0.07, width: 0.5 })
  assert.equal(collisionMesh.material.diffuseColor.r, 1)
  assert.deepEqual(emptySizeMesh.options, { depth: 0.06, height: 0.06, width: 1 })
  assert.equal(failedPhysicsMesh.physicsImpostor, undefined)
  assert.equal(physicsMesh.physicsImpostor.options.mass, 0)
  assert.deepEqual(throwingPhysics.errors, ['physics failed'])
  assert.deepEqual(stringPhysics.errors, ['physics string'])
  assert.equal(Math.round(sphereMesh.material.diffuseColor.r * 1000) / 1000, 0.671)
  assert.equal(Math.round(sphereMesh.material.diffuseColor.g * 1000) / 1000, 0.804)
  assert.equal(Math.round(sphereMesh.material.diffuseColor.b * 1000) / 1000, 0.937)
  assert.equal(sphereMesh.scaling.x, undefined)
  assert.equal(externalMesh.position.x, 7)
  assert.equal(sphereMesh.position.x, 4)
  assert.equal(mesh.position.x, 1)
  assert.equal(mesh.position.y, 2)
  assert.equal(mesh.position.z, 3)
  assert.equal(mesh.rotation.z, 0.5)
  assert.equal(mesh.scaling.x, 1)
  assert.equal(mesh.scaling.y, 1)
  assert.equal(mesh.scaling.z, 1)
  assert.equal(externalMesh.scaling.x, undefined)
  assert.deepEqual(quaternionMesh.rotationQuaternion, { x: 0, y: 0, z: 0.75 })
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
  const actuatorControls = fakeElement('div')
  const refreshed = []
  const keyHandlers = []
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
        '[data-actuator-controls]': actuatorControls,
        'sol-robot': robotElement
      }[selector]
    },
    createElement (tag) {
      return fakeElement(tag)
    },
    addEventListener (event, handler) {
      keyHandlers.push([event, handler])
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
  assert.equal(status.textContent, 'Loaded 6 links with physics')
  assert.equal(result.scene.rendered, 2)
  assert.equal(result.camera.attachedCanvas, canvas)
  assert.equal(result.light.intensity, 0.85)
  assert.equal(result.physics.enabled, true)
  assert.equal(result.controls.target, actuatorControls)
  assert.equal(actuatorControls.childNodes.length, 2)
  assert.equal(keyHandlers[0][0], 'keydown')
})

it('bootSimulation reports when Babylon physics is unavailable', async () => {
  const [robotElement] = parseMarkup(`
    <sol-robot name="static-five-bar">
      <sol-robot-link name="base"></sol-robot-link>
      <sol-robot-link name="left_crank"></sol-robot-link>
      <sol-robot-link name="right_crank"></sol-robot-link>
      <sol-robot-link name="left_coupler"></sol-robot-link>
      <sol-robot-link name="right_coupler"></sol-robot-link>
      <sol-robot-link name="end_effector"></sol-robot-link>
    </sol-robot>
  `)
  const status = { textContent: '' }
  const document = simulationDocument(robotElement, status)
  const BABYLON = fakeBabylon()

  BABYLON.CannonJSPlugin = null

  const result = await bootSimulation({
    BABYLON,
    configureKernel () {},
    document,
    loadElements: async () => [],
    runtime: {}
  })

  assert.equal(result.physics.enabled, false)
  assert.equal(status.textContent, 'Loaded 6 links without physics')
})

it('renderActuatorControls and keyboard handlers clamp actuator commands', () => {
  const target = fakeElement('div')
  const keyHandlers = []
  const document = {
    querySelector (selector) {
      assert.equal(selector, '[data-actuator-controls]')
      return target
    },
    createElement (tag) {
      return fakeElement(tag)
    },
    addEventListener (event, handler) {
      keyHandlers.push([event, handler])
    }
  }
  const updates = []
  const runtime = {
    actuators: [
      { name: 'left', joint: 'left_motor', lower: 0, upper: Math.PI / 2, value: Math.PI / 4 },
      { name: 'right', joint: 'right_motor', lower: -Math.PI / 2, upper: 0, value: -Math.PI / 4 }
    ],
    adjustActuator (name, delta) {
      const actuator = this.actuators.find((entry) => entry.name === name)
      actuator.value = Math.min(Math.max(actuator.value + delta, actuator.lower), actuator.upper)
    },
    setActuator (name, value) {
      const actuator = this.actuators.find((entry) => entry.name === name)
      actuator.value = Math.min(Math.max(value, actuator.lower), actuator.upper)
    },
    update () {
      updates.push(this.actuators.map((actuator) => actuator.value))
    }
  }
  const controls = renderActuatorControls(document, runtime)
  const prevented = []

  attachActuatorKeyboardControls(document, runtime, controls)
  controls.inputs.get('left').input.value = '90'
  controls.inputs.get('left').input.listeners.input[0]()
  keyHandlers[0][1]({ key: 'ArrowRight', preventDefault () { prevented.push('right') } })
  keyHandlers[0][1]({ key: 'ArrowUp', preventDefault () { prevented.push('up') } })
  keyHandlers[0][1]({ key: 'Escape', preventDefault () { prevented.push('escape') } })

  assert.equal(target.childNodes.length, 2)
  assert.equal(controls.inputs.get('left').output.textContent, '90 deg')
  assert.equal(runtime.actuators[0].value, Math.PI / 2)
  assert.equal(Math.round(runtime.actuators[1].value * 1000) / 1000, -0.698)
  assert.deepEqual(prevented, ['right', 'up'])
  assert.equal(updates.length, 3)
})

it('enableSimulationPhysics reports enabled and unavailable Babylon physics states', () => {
  const BABYLON = fakeBabylon()
  const enabledScene = new BABYLON.Scene({})
  const disabledScene = new BABYLON.Scene({})

  disabledScene.enablePhysics = () => false
  const unavailable = enableSimulationPhysics({}, {})
  const enabled = enableSimulationPhysics(BABYLON, enabledScene)
  const disabled = enableSimulationPhysics(BABYLON, disabledScene)
  const throwing = enableSimulationPhysics({
    CANNON: {},
    CannonJSPlugin: class CannonJSPlugin {
      constructor () {
        throw new Error('missing solver')
      }
    },
    Vector3: BABYLON.Vector3
  }, enabledScene)
  const throwingString = enableSimulationPhysics({
    CANNON: {},
    CannonJSPlugin: class CannonJSPlugin {
      constructor () {
        throwValue('string failure')
      }
    },
    Vector3: BABYLON.Vector3
  }, enabledScene)

  assert.equal(unavailable.enabled, false)
  assert.equal(unavailable.reason, 'physics-plugin-unavailable')
  assert.equal(enabled.enabled, true)
  assert.equal(enabled.plugin, 'CannonJSPlugin')
  assert.equal(enabledScene.physicsGravity.y, -9.807)
  assert.equal(disabled.enabled, false)
  assert.equal(disabled.reason, 'physics-not-enabled')
  assert.equal(throwing.enabled, false)
  assert.deepEqual(throwing.errors, ['missing solver'])
  assert.deepEqual(throwingString.errors, ['string failure'])
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
    CANNON: {},
    CannonJSPlugin: class CannonJSPlugin {
      constructor (useDeltaForWorldStep, iterations, cannon) {
        Object.assign(this, { cannon, iterations, name: 'CannonJSPlugin', useDeltaForWorldStep })
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
    PhysicsImpostor: class PhysicsImpostor {
      static BoxImpostor = 'box'
      static SphereImpostor = 'sphere'

      constructor (mesh, type, options, scene) {
        Object.assign(this, { mesh, options, scene, type })
      }

      forceUpdate () {
        this.updated = true
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

      enablePhysics (gravity, plugin) {
        this.physicsGravity = gravity
        this.physicsPlugin = plugin
        return true
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

function simulationDocument (robotElement, status = { textContent: '' }) {
  const canvas = {}
  const cadModel = { innerHTML: '' }
  const robotJson = { textContent: '' }
  const actuatorControls = fakeElement('div')
  const cadViewer = {
    async refresh (target) {
      return { target }
    }
  }

  return {
    querySelector (selector) {
      return {
        '#simulation-canvas': canvas,
        '#five-bar-geometry': cadModel,
        '[data-status]': status,
        '[data-robot-json]': robotJson,
        '[data-robot-viewer]': cadViewer,
        '[data-actuator-controls]': actuatorControls,
        'sol-robot': robotElement
      }[selector]
    },
    createElement (tag) {
      return fakeElement(tag)
    },
    addEventListener () {}
  }
}

function fakeElement (tag) {
  return {
    childNodes: [],
    className: '',
    listeners: {},
    tag,
    append (...children) {
      children.forEach((child) => this.appendChild(child))
    },
    appendChild (child) {
      this.childNodes.push(child)
      return child
    },
    addEventListener (event, handler) {
      this.listeners[event] = this.listeners[event] || []
      this.listeners[event].push(handler)
    },
    replaceChildren (...children) {
      this.childNodes = []
      this.append(...children)
    }
  }
}

function throwValue (value) {
  throw value
}

function assertNearlyEqual (actual, expected, tolerance = 1e-9) {
  assert.equal(Math.abs(actual - expected) <= tolerance, true)
}

function openLimitRobot (overrides = {}) {
  return {
    links: [],
    joints: [],
    actuators: [{
      name: 'left_motor_drive',
      joint: 'left_motor',
      limits: { lower: -Math.PI, upper: Math.PI }
    }, {
      name: 'right_motor_drive',
      joint: 'right_motor',
      limits: { lower: -Math.PI, upper: Math.PI }
    }],
    ...overrides
  }
}
