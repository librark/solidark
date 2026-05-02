import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as robot from './index.js'

it('robot index exports the robot extension API', () => {
  assert.equal(robot.RobotComponent.tag, 'sol-robot')
  assert.equal(robot.RobotLinkComponent.tag, 'sol-robot-link')
  assert.equal(robot.RobotJointComponent.tag, 'sol-robot-joint')
  assert.equal(robot.RobotFrameComponent.tag, 'sol-robot-frame')
  assert.equal(robot.RobotVisualComponent.tag, 'sol-robot-visual')
  assert.equal(robot.RobotCollisionComponent.tag, 'sol-robot-collision')
  assert.equal(robot.RobotInertialComponent.tag, 'sol-robot-inertial')
  assert.equal(robot.RobotLimitComponent.tag, 'sol-robot-limit')
  assert.equal(robot.RobotActuatorComponent.tag, 'sol-robot-actuator')
  assert.equal(robot.RobotSensorComponent.tag, 'sol-robot-sensor')
  assert.equal(typeof robot.defineRobotElements, 'function')
  assert.equal(typeof robot.compileRobotDefinition, 'function')
  assert.equal(typeof robot.createRobotDefinitionBundle, 'function')
  assert.equal(typeof robot.exportRobotJson, 'function')
  assert.ok(robot.robotElements.includes(robot.RobotComponent))
})
