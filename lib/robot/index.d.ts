import { Component } from "../index.js";

export class RobotComponent extends Component {
  static tag: "sol-robot";
  static category: "robot";
  static geometryKind: null;
}

export class RobotLinkComponent extends Component {
  static tag: "sol-robot-link";
  static category: "robot";
  static geometryKind: null;
}

export class RobotJointComponent extends Component {
  static tag: "sol-robot-joint";
  static category: "robot";
  static geometryKind: null;
}

export class RobotFrameComponent extends Component {
  static tag: "sol-robot-frame";
  static category: "robot";
  static geometryKind: null;
}

export class RobotVisualComponent extends Component {
  static tag: "sol-robot-visual";
  static category: "robot";
  static geometryKind: null;
}

export class RobotCollisionComponent extends Component {
  static tag: "sol-robot-collision";
  static category: "robot";
  static geometryKind: null;
}

export class RobotInertialComponent extends Component {
  static tag: "sol-robot-inertial";
  static category: "robot";
  static geometryKind: null;
}

export class RobotLimitComponent extends Component {
  static tag: "sol-robot-limit";
  static category: "robot";
  static geometryKind: null;
}

export class RobotActuatorComponent extends Component {
  static tag: "sol-robot-actuator";
  static category: "robot";
  static geometryKind: null;
}

export class RobotSensorComponent extends Component {
  static tag: "sol-robot-sensor";
  static category: "robot";
  static geometryKind: null;
}

export type RobotDiagnostic = {
  level: string;
  code: string;
  message: string;
  sourcePath: string;
};

export type RobotSourceMapEntry = {
  sourcePath: string;
  externalId: string;
  role: string;
};

export type RobotGeometryDescriptor = {
  tag: string;
  sourcePath: string;
  properties: Record<string, unknown>;
  children: RobotGeometryDescriptor[];
};

export type RobotInertial = {
  mass: number;
  centerOfMass?: number[];
  inertia?: number[];
};

export type RobotLink = {
  name: string;
  visuals: RobotGeometryDescriptor[];
  collisions: RobotGeometryDescriptor[];
  inertial?: RobotInertial;
};

export type RobotJoint = {
  name: string;
  type: string;
  parent: string;
  child: string;
  origin: number[];
  axis: number[];
  limits?: Record<string, number>;
};

export type RobotActuator = {
  name: string;
  joint: string;
  kind?: string;
  limits?: Record<string, number>;
  initial?: number;
  [property: string]: unknown;
};

export type RobotDefinition = {
  schema: string;
  name: string;
  unit: "m";
  links: RobotLink[];
  joints: RobotJoint[];
  frames: Record<string, unknown>[];
  actuators: RobotActuator[];
  sensors: Record<string, unknown>[];
  sourceMap: RobotSourceMapEntry[];
  diagnostics: RobotDiagnostic[];
};

export type RobotDefinitionFile = {
  path: string;
  mediaType: string;
  role: string;
  content: string;
};

export type RobotDefinitionBundle = {
  files: RobotDefinitionFile[];
  sourceMap: RobotSourceMapEntry[];
  diagnostics: RobotDiagnostic[];
  metadata: {
    name: string;
    schema: string;
  };
};

export const robotElements: readonly typeof Component[];
export function defineRobotElements(): readonly typeof Component[];
export function compileRobotDefinition(
  element: Element,
  options?: { schema?: string }
): Promise<RobotDefinition>;
export function createRobotDefinitionBundle(
  input: Element | RobotDefinition,
  options?: { schema?: string }
): Promise<RobotDefinitionBundle>;
export function exportRobotJson(robot: RobotDefinition): string;
