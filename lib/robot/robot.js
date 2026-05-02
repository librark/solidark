import { Component } from '../base/component.js'

const schemaVersion = 'solidark.robot.v1'
const linearGeometryProperties = new Set([
  'by',
  'depth',
  'diameter',
  'height',
  'length',
  'majorRadius',
  'minorRadius',
  'radius',
  'size',
  'width'
])
const angularJointTypes = new Set(['continuous', 'revolute'])

export class RobotComponent extends Component {
  static tag = 'sol-robot'
  static category = 'robot'
  static geometryKind = null
}

export class RobotLinkComponent extends Component {
  static tag = 'sol-robot-link'
  static category = 'robot'
  static geometryKind = null
}

export class RobotJointComponent extends Component {
  static tag = 'sol-robot-joint'
  static category = 'robot'
  static geometryKind = null
}

export class RobotFrameComponent extends Component {
  static tag = 'sol-robot-frame'
  static category = 'robot'
  static geometryKind = null
}

export class RobotVisualComponent extends Component {
  static tag = 'sol-robot-visual'
  static category = 'robot'
  static geometryKind = null
}

export class RobotCollisionComponent extends Component {
  static tag = 'sol-robot-collision'
  static category = 'robot'
  static geometryKind = null

  static evaluateNode () {
    return []
  }
}

export class RobotInertialComponent extends Component {
  static tag = 'sol-robot-inertial'
  static category = 'robot'
  static geometryKind = null
}

export class RobotLimitComponent extends Component {
  static tag = 'sol-robot-limit'
  static category = 'robot'
  static geometryKind = null
}

export class RobotActuatorComponent extends Component {
  static tag = 'sol-robot-actuator'
  static category = 'robot'
  static geometryKind = null
}

export class RobotSensorComponent extends Component {
  static tag = 'sol-robot-sensor'
  static category = 'robot'
  static geometryKind = null
}

export const robotElements = Object.freeze([
  RobotComponent,
  RobotLinkComponent,
  RobotJointComponent,
  RobotFrameComponent,
  RobotVisualComponent,
  RobotCollisionComponent,
  RobotInertialComponent,
  RobotLimitComponent,
  RobotActuatorComponent,
  RobotSensorComponent
])

robotElements.forEach((ElementClass) => ElementClass.define())

export function defineRobotElements () {
  return robotElements
}

export async function compileRobotDefinition (element, options = {}) {
  await flushElement(element)

  const properties = readProperties(element)
  const diagnostics = []
  const robot = {
    schema: options.schema || schemaVersion,
    name: nameFor(properties, 'robot', 'sol-robot', diagnostics, 'missing-robot-name'),
    unit: 'm',
    links: [],
    joints: [],
    frames: [],
    actuators: [],
    sensors: [],
    sourceMap: [],
    diagnostics
  }

  for (const [index, child] of childEntries(element)) {
    const path = childPath('sol-robot', child, index)
    const tag = child.localName

    if (tag === RobotLinkComponent.tag) {
      robot.links.push(compileLink(child, path, robot))
    } else if (tag === RobotJointComponent.tag) {
      robot.joints.push(compileJoint(child, path, robot))
    } else if (tag === RobotFrameComponent.tag) {
      robot.frames.push(compileNamedMetadata(child, path, robot, 'frame'))
    } else if (tag === RobotActuatorComponent.tag) {
      robot.actuators.push(compileActuator(child, path, robot))
    } else if (tag === RobotSensorComponent.tag) {
      robot.sensors.push(compileNamedMetadata(child, path, robot, 'sensor'))
    } else {
      addDiagnostic(robot, 'unknown-robot-child', `Unsupported robot child ${tag}`, path)
    }
  }

  finalizeActuators(robot)
  validateRobot(robot)
  return robot
}

export async function createRobotDefinitionBundle (input, options = {}) {
  const robot = isElement(input)
    ? await compileRobotDefinition(input, options)
    : input
  const content = exportRobotJson(robot)

  return {
    files: [{
      path: `${robot.name}/robot.json`,
      mediaType: 'application/json',
      role: 'robot-description',
      content
    }],
    sourceMap: robot.sourceMap,
    diagnostics: robot.diagnostics,
    metadata: {
      name: robot.name,
      schema: robot.schema
    }
  }
}

export function exportRobotJson (robot) {
  return `${JSON.stringify(robot, null, 2)}\n`
}

function compileLink (element, path, robot) {
  const properties = readProperties(element)
  const link = {
    name: nameFor(properties, `link-${robot.links.length}`, path, robot.diagnostics, 'missing-link-name'),
    visuals: [],
    collisions: []
  }

  addSourceMap(robot, path, link.name, 'link')

  for (const [index, child] of childEntries(element)) {
    const entryPath = childPath(path, child, index)
    const tag = child.localName

    if (tag === RobotVisualComponent.tag) {
      link.visuals.push(...compileGeometryGroup(child, entryPath))
    } else if (tag === RobotCollisionComponent.tag) {
      link.collisions.push(...compileGeometryGroup(child, entryPath))
    } else if (tag === RobotInertialComponent.tag) {
      link.inertial = compileInertial(child)
    } else {
      addDiagnostic(robot, 'unknown-link-child', `Unsupported link child ${tag}`, entryPath)
    }
  }

  return link
}

function compileJoint (element, path, robot) {
  const properties = readProperties(element)
  const type = String(properties.type || 'fixed')
  const joint = {
    name: nameFor(properties, `joint-${robot.joints.length}`, path, robot.diagnostics, 'missing-joint-name'),
    type,
    parent: stringValue(properties.parent),
    child: stringValue(properties.child),
    origin: metersVector(properties.origin || [0, 0, 0]),
    axis: vectorValue(properties.axis || [0, 0, 1])
  }
  const limits = compileJointLimits(properties, type)

  if (Object.keys(limits).length > 0) {
    joint.limits = limits
  }

  for (const [index, child] of childEntries(element)) {
    const entryPath = childPath(path, child, index)

    if (child.localName === RobotLimitComponent.tag) {
      joint.limits = {
        ...(joint.limits || {}),
        ...compileJointLimits(readProperties(child), type)
      }
    } else {
      addDiagnostic(robot, 'unknown-joint-child', `Unsupported joint child ${child.localName}`, entryPath)
    }
  }

  addSourceMap(robot, path, joint.name, 'joint')
  return joint
}

function compileActuator (element, path, robot) {
  const properties = readProperties(element)
  const name = nameFor(properties, `actuator-${robot.actuators.length}`, path, robot.diagnostics, 'missing-actuator-name')
  const jointName = stringValue(properties.joint)
  const jointType = robot.joints.find((joint) => joint.name === jointName)?.type || 'revolute'
  const actuator = {
    ...metadataProperties(properties, actuatorLimitPropertyNames),
    name
  }
  const limits = compileActuatorLimits(properties, jointType)

  if (Object.keys(limits).length > 0) {
    actuator.limits = limits
  }

  if (properties.initial !== undefined) {
    actuator.initial = convertJointLimit(properties.initial, jointType)
  }

  for (const [index, child] of childEntries(element)) {
    const entryPath = childPath(path, child, index)

    if (child.localName === RobotLimitComponent.tag) {
      actuator.limits = {
        ...(actuator.limits || {}),
        ...compileActuatorLimits(readProperties(child), jointType)
      }
    } else {
      addDiagnostic(robot, 'unknown-actuator-child', `Unsupported actuator child ${child.localName}`, entryPath)
    }
  }

  addSourceMap(robot, path, name, 'actuator')
  return actuator
}

function compileNamedMetadata (element, path, robot, role) {
  const properties = readProperties(element)
  const name = nameFor(properties, `${role}-${robot[`${role}s`].length}`, path, robot.diagnostics, `missing-${role}-name`)
  const entry = {
    ...properties,
    name
  }

  addSourceMap(robot, path, name, role)
  return entry
}

function compileInertial (element) {
  const properties = readProperties(element)
  const inertial = {
    mass: Number(properties.mass || 0)
  }

  if (properties.centerOfMass !== undefined) {
    inertial.centerOfMass = metersVector(properties.centerOfMass)
  }

  if (properties.inertia !== undefined) {
    inertial.inertia = vectorValue(properties.inertia)
  }

  return inertial
}

function compileJointLimits (properties, type) {
  const limits = {}

  for (const key of ['lower', 'upper']) {
    const value = limitProperty(properties, key)

    if (value !== undefined) {
      limits[key] = convertJointLimit(value, type)
    }
  }

  for (const key of ['effort', 'velocity']) {
    if (properties[key] !== undefined) {
      limits[key] = Number(properties[key])
    }
  }

  return limits
}

function compileActuatorLimits (properties, jointType) {
  const limits = {}

  for (const key of ['lower', 'upper']) {
    const value = limitProperty(properties, key)

    if (value !== undefined) {
      limits[key] = convertJointLimit(value, jointType)
    }
  }

  for (const key of ['effort', 'velocity']) {
    if (properties[key] !== undefined) {
      limits[key] = Number(properties[key])
    }
  }

  return limits
}

function compileGeometryGroup (element, path) {
  return childEntries(element).map(([index, child]) => {
    return compileGeometryNode(child, childPath(path, child, index))
  })
}

function compileGeometryNode (element, path) {
  return {
    tag: element.localName,
    sourcePath: path,
    properties: convertGeometryProperties(readProperties(element)),
    children: childEntries(element).map(([index, child]) => {
      return compileGeometryNode(child, childPath(path, child, index))
    })
  }
}

function convertGeometryProperties (properties) {
  const converted = {}

  for (const [key, value] of Object.entries(properties)) {
    converted[key] = linearGeometryProperties.has(key) ? metersValue(value) : value
  }

  return converted
}

function validateRobot (robot) {
  diagnoseDuplicates(robot, robot.links, 'link')
  diagnoseDuplicates(robot, robot.joints, 'joint')
  diagnoseDuplicates(robot, robot.frames, 'frame')
  diagnoseDuplicates(robot, robot.actuators, 'actuator')
  diagnoseDuplicates(robot, robot.sensors, 'sensor')

  const links = new Set(robot.links.map((link) => link.name))

  for (const joint of robot.joints) {
    if (!links.has(joint.parent)) {
      addDiagnostic(robot, 'missing-joint-parent', `Joint ${joint.name} references missing parent link ${joint.parent}`, joint.name)
    }

    if (!links.has(joint.child)) {
      addDiagnostic(robot, 'missing-joint-child', `Joint ${joint.name} references missing child link ${joint.child}`, joint.name)
    }
  }

  for (const actuator of robot.actuators) {
    if (!robot.joints.some((joint) => joint.name === actuator.joint)) {
      addDiagnostic(robot, 'missing-actuator-joint', `Actuator ${actuator.name} references missing joint ${actuator.joint}`, actuator.name)
    }
  }
}

function finalizeActuators (robot) {
  const joints = new Map(robot.joints.map((joint) => [joint.name, joint]))

  for (const actuator of robot.actuators) {
    const joint = joints.get(actuator.joint)

    if (joint?.limits) {
      const inherited = {}

      for (const key of ['lower', 'upper']) {
        if (actuator.limits?.[key] === undefined && joint.limits[key] !== undefined) {
          inherited[key] = joint.limits[key]
        }
      }

      if (Object.keys(inherited).length > 0) {
        actuator.limits = { ...(actuator.limits || {}), ...inherited }
      }
    }
  }
}

function diagnoseDuplicates (robot, entries, role) {
  const seen = new Set()

  for (const entry of entries) {
    if (seen.has(entry.name)) {
      addDiagnostic(robot, `duplicate-${role}`, `Duplicate ${role} name ${entry.name}`, entry.name)
    }

    seen.add(entry.name)
  }
}

function addSourceMap (robot, sourcePath, externalId, role) {
  robot.sourceMap.push({
    sourcePath,
    externalId,
    role
  })
}

function addDiagnostic (robot, code, message, sourcePath) {
  robot.diagnostics.push({
    level: 'error',
    code,
    message,
    sourcePath
  })
}

function nameFor (properties, fallback, path, diagnostics, code) {
  if (properties.name !== undefined) {
    return String(properties.name)
  }

  diagnostics.push({
    level: 'warning',
    code,
    message: `Missing name at ${path}; using ${fallback}`,
    sourcePath: path
  })
  return fallback
}

function readProperties (element) {
  return element.properties
}

function childEntries (element) {
  return Array.from(element.children).map((child, index) => [index, child])
}

function childPath (parentPath, child, index) {
  return `${parentPath} > ${child.localName}[${index}]`
}

function stringValue (value) {
  return value === undefined ? '' : String(value)
}

const actuatorLimitPropertyNames = new Set([
  'effort',
  'initial',
  'lower',
  'max',
  'maximum',
  'min',
  'minimum',
  'upper',
  'velocity'
])

function metadataProperties (properties, excluded) {
  const metadata = {}

  for (const [key, value] of Object.entries(properties)) {
    if (!excluded.has(key)) {
      metadata[key] = value
    }
  }

  return metadata
}

function limitProperty (properties, key) {
  const aliases = key === 'lower'
    ? ['lower', 'minimum', 'min']
    : ['upper', 'maximum', 'max']

  for (const alias of aliases) {
    if (properties[alias] !== undefined) {
      return properties[alias]
    }
  }

  return undefined
}

function metersVector (value) {
  return vectorValue(value).map((entry) => entry * 0.001)
}

function vectorValue (value) {
  return Array.isArray(value) ? value.map(Number) : [Number(value)]
}

function metersValue (value) {
  return Array.isArray(value)
    ? value.map((entry) => Number(entry) * 0.001)
    : Number(value) * 0.001
}

function convertJointLimit (value, type) {
  const number = Number(value)
  return angularJointTypes.has(type) ? number * Math.PI / 180 : number * 0.001
}

function isElement (value) {
  return Boolean(value && typeof value === 'object' && 'localName' in value)
}

async function flushElement (element) {
  await element.rendered
  await element.updated

  for (const child of element.children) {
    await flushElement(child)
  }
}
