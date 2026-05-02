import assert from 'node:assert/strict'
import { it } from 'node:test'

import '../elements.js'
import { parseMarkup } from '../dom.js'
import { SolidarkRuntime } from '../runtime/index.js'
import { useInMemoryKernel } from '../runtime/kernel/index.js'
import {
  RobotActuatorComponent,
  RobotCollisionComponent,
  RobotComponent,
  RobotFrameComponent,
  RobotInertialComponent,
  RobotJointComponent,
  RobotLimitComponent,
  RobotLinkComponent,
  RobotSensorComponent,
  RobotVisualComponent,
  compileRobotDefinition,
  createRobotDefinitionBundle,
  defineRobotElements,
  exportRobotJson,
  robotElements
} from './robot.js'

it('robot component classes are registered as robot elements', () => {
  assert.equal(RobotComponent.tag, 'sol-robot')
  assert.equal(RobotLinkComponent.tag, 'sol-robot-link')
  assert.equal(RobotJointComponent.tag, 'sol-robot-joint')
  assert.equal(RobotFrameComponent.tag, 'sol-robot-frame')
  assert.equal(RobotVisualComponent.tag, 'sol-robot-visual')
  assert.equal(RobotCollisionComponent.tag, 'sol-robot-collision')
  assert.equal(RobotInertialComponent.tag, 'sol-robot-inertial')
  assert.equal(RobotLimitComponent.tag, 'sol-robot-limit')
  assert.equal(RobotActuatorComponent.tag, 'sol-robot-actuator')
  assert.equal(RobotSensorComponent.tag, 'sol-robot-sensor')
  assert.equal(RobotComponent.category, 'robot')
  assert.equal(RobotComponent.geometryKind, null)
  assert.equal(defineRobotElements(), robotElements)
})

it('compileRobotDefinition compiles robot metadata and geometry descriptors', async () => {
  const [robotElement] = parseMarkup(`
    <sol-robot name="arm">
      <sol-robot-link name="base">
        <sol-robot-visual>
          <sol-translate by="10 0 0">
            <sol-cuboid size="100 20 10" color="#ff0000"></sol-cuboid>
          </sol-translate>
        </sol-robot-visual>
        <sol-robot-collision>
          <sol-cylinder radius="5" height="20"></sol-cylinder>
        </sol-robot-collision>
        <sol-robot-inertial mass="1.2" center-of-mass="10 20 30" inertia="1 2 3"></sol-robot-inertial>
      </sol-robot-link>
      <sol-robot-link name="elbow"></sol-robot-link>
      <sol-robot-frame name="tool" link="elbow"></sol-robot-frame>
      <sol-robot-joint
        name="base_to_elbow"
        type="revolute"
        parent="base"
        child="elbow"
        origin="0 0 50"
        axis="0 0 1">
        <sol-robot-limit lower="-90" upper="90" effort="5" velocity="2"></sol-robot-limit>
      </sol-robot-joint>
      <sol-robot-actuator name="elbow_motor" joint="base_to_elbow" kind="servo" initial="10">
        <sol-robot-limit min="-45" max="45" effort="3" velocity="4"></sol-robot-limit>
      </sol-robot-actuator>
      <sol-robot-sensor name="tool_camera" link="elbow" kind="camera"></sol-robot-sensor>
    </sol-robot>
  `)

  const robot = await compileRobotDefinition(robotElement)

  assert.equal(robot.schema, 'solidark.robot.v1')
  assert.equal(robot.name, 'arm')
  assert.equal(robot.unit, 'm')
  assert.equal(robot.links.length, 2)
  assert.equal(robot.links[0].name, 'base')
  assert.deepEqual(robot.links[0].visuals[0], {
    tag: 'sol-translate',
    sourcePath: 'sol-robot > sol-robot-link[0] > sol-robot-visual[0] > sol-translate[0]',
    properties: { by: [0.01, 0, 0] },
    children: [{
      tag: 'sol-cuboid',
      sourcePath: 'sol-robot > sol-robot-link[0] > sol-robot-visual[0] > sol-translate[0] > sol-cuboid[0]',
      properties: { color: '#ff0000', size: [0.1, 0.02, 0.01] },
      children: []
    }]
  })
  assert.deepEqual(robot.links[0].collisions[0].properties, { radius: 0.005, height: 0.02 })
  assert.deepEqual(robot.links[0].inertial, {
    mass: 1.2,
    centerOfMass: [0.01, 0.02, 0.03],
    inertia: [1, 2, 3]
  })
  assert.deepEqual(robot.joints[0], {
    name: 'base_to_elbow',
    type: 'revolute',
    parent: 'base',
    child: 'elbow',
    origin: [0, 0, 0.05],
    axis: [0, 0, 1],
    limits: {
      lower: -Math.PI / 2,
      upper: Math.PI / 2,
      effort: 5,
      velocity: 2
    }
  })
  assert.deepEqual(robot.frames, [{ name: 'tool', link: 'elbow' }])
  assert.deepEqual(robot.actuators, [{
    name: 'elbow_motor',
    joint: 'base_to_elbow',
    kind: 'servo',
    limits: {
      lower: -Math.PI / 4,
      upper: Math.PI / 4,
      effort: 3,
      velocity: 4
    },
    initial: Math.PI / 18
  }])
  assert.deepEqual(robot.sensors, [{ name: 'tool_camera', link: 'elbow', kind: 'camera' }])
  assert.deepEqual(robot.diagnostics, [])
  assert.deepEqual(robot.sourceMap.map((entry) => entry.role), ['link', 'link', 'frame', 'joint', 'actuator', 'sensor'])
})

it('compileRobotDefinition reports deterministic diagnostics and default names', async () => {
  const [robotElement] = parseMarkup(`
    <sol-robot>
      <sol-cuboid size="10 10 10"></sol-cuboid>
      <sol-robot-link>
        <sol-robot-sensor name="nested_sensor"></sol-robot-sensor>
      </sol-robot-link>
      <sol-robot-link name="link-0"></sol-robot-link>
      <sol-robot-link name="lonely">
        <sol-robot-inertial></sol-robot-inertial>
      </sol-robot-link>
      <sol-robot-frame></sol-robot-frame>
      <sol-robot-joint
        type="prismatic"
        parent="missing_parent"
        child="missing_child"
        lower="0"
        upper="100">
      </sol-robot-joint>
      <sol-robot-joint name="fixed_joint" axis="1">
        <sol-cuboid size="10 10 10"></sol-cuboid>
      </sol-robot-joint>
      <sol-robot-actuator joint="missing_joint" lower="-10" upper="10">
        <sol-cuboid size="10 10 10"></sol-cuboid>
      </sol-robot-actuator>
      <sol-robot-sensor></sol-robot-sensor>
    </sol-robot>
  `)

  const robot = await compileRobotDefinition(robotElement, { schema: 'custom.schema' })

  assert.equal(robot.schema, 'custom.schema')
  assert.equal(robot.name, 'robot')
  assert.equal(robot.links[0].name, 'link-0')
  assert.deepEqual(robot.links[2].inertial, { mass: 0 })
  assert.deepEqual(robot.joints[0].limits, { lower: 0, upper: 0.1 })
  assert.deepEqual(robot.joints[1], {
    name: 'fixed_joint',
    type: 'fixed',
    parent: '',
    child: '',
    origin: [0, 0, 0],
    axis: [1]
  })
  assert.deepEqual(robot.diagnostics.map((entry) => entry.code), [
    'missing-robot-name',
    'unknown-robot-child',
    'missing-link-name',
    'unknown-link-child',
    'missing-frame-name',
    'missing-joint-name',
    'unknown-joint-child',
    'missing-actuator-name',
    'unknown-actuator-child',
    'missing-sensor-name',
    'duplicate-link',
    'missing-joint-parent',
    'missing-joint-child',
    'missing-joint-parent',
    'missing-joint-child',
    'missing-actuator-joint'
  ])
})

it('createRobotDefinitionBundle exports element and object inputs', async () => {
  const [robotElement] = parseMarkup(`
    <sol-robot name="bundle">
      <sol-robot-link name="base"></sol-robot-link>
    </sol-robot>
  `)

  const elementBundle = await createRobotDefinitionBundle(robotElement)
  const objectBundle = await createRobotDefinitionBundle({
    schema: 'solidark.robot.v1',
    name: 'object',
    sourceMap: [],
    diagnostics: []
  })

  assert.equal(elementBundle.files[0].path, 'bundle/robot.json')
  assert.equal(elementBundle.files[0].mediaType, 'application/json')
  assert.equal(elementBundle.files[0].role, 'robot-description')
  assert.equal(elementBundle.metadata.name, 'bundle')
  assert.equal(elementBundle.metadata.schema, 'solidark.robot.v1')
  assert.deepEqual(JSON.parse(elementBundle.files[0].content), {
    schema: 'solidark.robot.v1',
    name: 'bundle',
    unit: 'm',
    links: [{
      name: 'base',
      visuals: [],
      collisions: []
    }],
    joints: [],
    frames: [],
    actuators: [],
    sensors: [],
    sourceMap: [{
      sourcePath: 'sol-robot > sol-robot-link[0]',
      externalId: 'base',
      role: 'link'
    }],
    diagnostics: []
  })
  assert.equal(objectBundle.files[0].path, 'object/robot.json')
  assert.equal(exportRobotJson({ name: 'plain' }), '{\n  "name": "plain"\n}\n')
})

it('exportRobotJson emits the stable robot JSON structure', async () => {
  const [robotElement] = parseMarkup(`
    <sol-robot name="json-robot">
      <sol-robot-link name="base">
        <sol-robot-visual>
          <sol-cuboid size="120 40 20"></sol-cuboid>
        </sol-robot-visual>
        <sol-robot-inertial mass="0.8"></sol-robot-inertial>
      </sol-robot-link>
      <sol-robot-link name="arm"></sol-robot-link>
      <sol-robot-joint name="hinge" type="revolute" parent="base" child="arm" lower="-45" upper="45"></sol-robot-joint>
    </sol-robot>
  `)

  const robot = await compileRobotDefinition(robotElement)
  const json = exportRobotJson(robot)

  assert.equal(json.endsWith('\n'), true)
  assert.deepEqual(JSON.parse(json), {
    schema: 'solidark.robot.v1',
    name: 'json-robot',
    unit: 'm',
    links: [
      {
        name: 'base',
        visuals: [{
          tag: 'sol-cuboid',
          sourcePath: 'sol-robot > sol-robot-link[0] > sol-robot-visual[0] > sol-cuboid[0]',
          properties: { size: [0.12, 0.04, 0.02] },
          children: []
        }],
        collisions: [],
        inertial: { mass: 0.8 }
      },
      {
        name: 'arm',
        visuals: [],
        collisions: []
      }
    ],
    joints: [{
      name: 'hinge',
      type: 'revolute',
      parent: 'base',
      child: 'arm',
      origin: [0, 0, 0],
      axis: [0, 0, 1],
      limits: {
        lower: -Math.PI / 4,
        upper: Math.PI / 4
      }
    }],
    frames: [],
    actuators: [],
    sensors: [],
    sourceMap: [
      {
        sourcePath: 'sol-robot > sol-robot-link[0]',
        externalId: 'base',
        role: 'link'
      },
      {
        sourcePath: 'sol-robot > sol-robot-link[1]',
        externalId: 'arm',
        role: 'link'
      },
      {
        sourcePath: 'sol-robot > sol-robot-joint[2]',
        externalId: 'hinge',
        role: 'joint'
      }
    ],
    diagnostics: []
  })
})

it('robot semantic components are transparent for model geometry evaluation', async () => {
  useInMemoryKernel()
  const [model] = parseMarkup(`
    <sol-model>
      <sol-robot name="preview">
        <sol-robot-link name="base">
          <sol-robot-visual>
            <sol-cuboid size="10 20 30"></sol-cuboid>
          </sol-robot-visual>
          <sol-robot-collision>
            <sol-sphere radius="5"></sol-sphere>
          </sol-robot-collision>
          <sol-robot-inertial mass="1"></sol-robot-inertial>
        </sol-robot-link>
        <sol-robot-joint name="fixed" parent="base" child="base"></sol-robot-joint>
      </sol-robot>
    </sol-model>
  `)

  const result = await SolidarkRuntime.evaluate(model)

  assert.equal(result.shapes.length, 1)
  assert.equal(result.shapes[0].tag, 'sol-cuboid')
  assert.deepEqual(result.shapes[0].properties.size, [10, 20, 30])
  result.dispose()
})
