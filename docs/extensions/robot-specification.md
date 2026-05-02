# Solidark Robot Extension Specification

Status: draft 0.1

Package: `@solidark/robot`

The robot extension should let users define robots, mechanisms, frames, and
simulation-ready assemblies around Solidark geometry. It should generate
accurate robot definition data that downstream tools can parse. It should not
own a simulation engine, application loop, controller runtime, or Babylon.js
loader.

## Goals

- Define robot links, joints, frames, visual geometry, collision geometry,
  inertial metadata, sensors, and actuators.
- Reuse Solidark core geometry for robot visuals and collision bodies.
- Export URDF for interoperability with existing robot tooling.
- Export a Solidark robot JSON format that is simple for JavaScript simulations,
  Webots import scripts, Babylon.js projects, Three.js projects, or custom
  engines to parse.
- Generate mesh assets and source maps alongside definition files.
- Keep behavior and simulation runtime code outside Solidark.

## Non-Goals

- The robot extension should not become a dynamics simulator.
- The robot extension should not depend on Babylon.js, Webots, ROS, or any
  simulator runtime.
- The robot extension should not own controllers, app loops, input handling, or
  physics-engine configuration.
- The robot extension should not hide unit conversions.

## Workflow

A Solidark robotics project should define geometry with Solidark core and robot
semantics with `@solidark/robot`.

```html
<sol-robot name="gantry">
  <sol-robot-link name="base">
    <sol-robot-visual>
      <gantry-frame></gantry-frame>
    </sol-robot-visual>
    <sol-robot-collision>
      <sol-cuboid size="420 220 30"></sol-cuboid>
    </sol-robot-collision>
    <sol-robot-inertial mass="2.4"></sol-robot-inertial>
  </sol-robot-link>

  <sol-robot-link name="x_carriage">
    <sol-robot-visual>
      <x-carriage></x-carriage>
    </sol-robot-visual>
    <sol-robot-inertial mass="0.35"></sol-robot-inertial>
  </sol-robot-link>

  <sol-robot-joint
    name="x_axis"
    type="prismatic"
    parent="base"
    child="x_carriage"
    axis="1 0 0"
    lower="0"
    upper="300">
  </sol-robot-joint>

  <sol-robot-actuator
    name="x_motor"
    joint="x_axis"
    kind="linear-motor">
  </sol-robot-actuator>
</sol-robot>
```

Compilation should produce a robot artifact bundle:

- `robot.json`
- `robot.urdf`
- mesh assets, such as GLB or STL files
- source map
- diagnostics
- package manifest

## Components

- `sol-robot`: root robot descriptor.
- `sol-robot-link`: rigid body.
- `sol-robot-joint`: fixed, revolute, continuous, prismatic, floating, or planar
  relationship between two links.
- `sol-robot-frame`: named coordinate frame without mass or geometry.
- `sol-robot-visual`: visual geometry subtree.
- `sol-robot-collision`: collision geometry subtree.
- `sol-robot-inertial`: mass, center of mass, and inertia tensor.
- `sol-robot-limit`: joint limits if separate from the joint component.
- `sol-robot-actuator`: motors, servos, or other joint drivers as metadata.
- `sol-robot-sensor`: camera, lidar, imu, force, distance, or contact sensors as
  metadata.

Robot components may produce no geometry. Their job is to describe physical and
semantic structure around Solidark geometry.

## Robot IR

The robot compiler should produce a deterministic, serializable IR before
writing external files.

The IR should include:

- Robot name and units.
- Links.
- Joints.
- Named frames.
- Visual geometry references.
- Collision geometry references.
- Inertial metadata.
- Sensors and actuators.
- Mesh asset references.
- Source map entries.
- Export diagnostics.

The IR should be stable enough for direct unit-test assertions without loading a
simulator.

## JSON Robot Export

The robot JSON exporter should produce an engine-neutral description of the same
robot data used for URDF export. It should favor simple, explicit structures over
clever abstractions.

Example shape:

```json
{
  "schema": "solidark.robot.v1",
  "name": "gantry",
  "unit": "m",
  "links": [
    {
      "name": "base",
      "visuals": [{ "mesh": "meshes/base.glb" }],
      "collisions": [{ "mesh": "meshes/base-collision.glb" }],
      "inertial": { "mass": 2.4, "centerOfMass": [0, 0, 0] }
    }
  ],
  "joints": [
    {
      "name": "x_axis",
      "type": "prismatic",
      "parent": "base",
      "child": "x_carriage",
      "axis": [1, 0, 0],
      "limits": { "lower": 0, "upper": 0.3 }
    }
  ],
  "actuators": [
    {
      "name": "x_motor",
      "joint": "x_axis",
      "kind": "linear-motor"
    }
  ]
}
```

Exporter rules:

- Convert Solidark millimeters to meters by default so the JSON aligns with
  URDF and common physics engines.
- Preserve source ids and component paths for every exported link, joint, mesh,
  actuator, and sensor.
- Include mesh asset paths rather than embedding binary mesh data.
- Keep behavior out of the export. A simulation project may attach controllers,
  input handling, physics constraints, or animation loops after loading the
  robot definition.
- Make the format stable enough to test with plain JSON assertions.
- Version the schema explicitly through a `schema` field.

## URDF Export

The URDF exporter should generate:

- `robot.urdf`
- Mesh assets referenced by URDF `visual` and `collision` nodes.
- A manifest linking Solidark source components to URDF links, joints, and mesh
  files.

Exporter rules:

- Convert Solidark millimeters to URDF meters.
- Convert Solidark degrees to URDF radians for joint limits and rotations.
- Preserve Solidark's `z`-up right-handed convention.
- Use URDF primitive geometry for simple boxes, cylinders, and spheres when the
  source geometry can be represented without loss.
- Export mesh assets for complex B-Rep geometry, features, boolean results,
  imported CAD, and styled parts.
- Generate separate visual and collision meshes so users can simplify collision
  geometry without degrading visual fidelity.
- Require link and joint names to be stable and unique.
- Validate that the joint graph is a tree where URDF requires it.
- Report missing inertial properties but allow visual-only export for early
  prototypes.

## Simulation Handoff

A Babylon.js project, Webots import script, or custom simulation can consume the
robot export without Solidark depending on that runtime:

```js
import robot from './dist/gantry.robot.json' with { type: 'json' }
import { loadRobotIntoScene } from './simulation/load-robot-into-scene.js'

const gantry = await loadRobotIntoScene(scene, robot)

scene.onBeforeRenderObservable.add(() => {
  gantry.joints.x_axis.setPosition(currentPosition)
})
```

The loader belongs to the simulation project because it knows the engine, scene,
physics plugin, controller style, UI, and performance constraints. Solidark's job
is to make the robot definition accurate, complete, deterministic, and easy to
parse.

## Validation

The robot compiler should report:

- Duplicate link, joint, or frame names.
- Missing joint parents or children.
- Cycles in the link-joint graph.
- Geometry assigned directly to `sol-robot` without a link.
- Links with visual geometry but no collision geometry when the selected export
  target requires collision.
- Missing mass or inertia when dynamics export is requested.
- Unit conversion and axis conversion assumptions.
- Meshes that are too detailed for collision use.
- Actuators attached to unsupported joint types.
- Sensors attached to missing links or frames.

## Implementation Phases

### Phase 1: Robot IR

- Implement robot components.
- Compile robot DOM trees into deterministic robot IR.
- Generate source maps and diagnostics.

Exit criteria:

- A two-link revolute mechanism compiles to robot IR.
- Link, joint, visual, collision, inertial, actuator, and sensor metadata are
  represented in the IR.

### Phase 2: JSON Export

- Generate `solidark.robot.v1` JSON.
- Generate mesh assets.
- Preserve source ids and component paths.

Exit criteria:

- A robot exports to deterministic JSON and mesh assets.
- A simulation project can parse the JSON without Solidark runtime code.

### Phase 3: URDF Export

- Generate URDF and referenced mesh assets.
- Convert units and angles explicitly.
- Validate URDF graph constraints.

Exit criteria:

- The same robot exports to valid URDF and deterministic JSON.
- Visual and collision geometry are exported separately.

### Phase 4: Robot Examples

- Add robot examples to the showcase.
- Include a simple mechanism and a gantry-style robot.
- Demonstrate a downstream loader as project-owned example code, not as a
  Solidark runtime dependency.

## Open Questions

- Should mass properties be explicitly authored first, computed from geometry
  first, or both?
- Should collision simplification be implemented in Solidark or delegated to
  external mesh tooling?
- Should the robot package include Xacro generation, or should plain URDF come
  first?
- How detailed should sensors and actuators be in the first JSON schema?
- Should five-bar robots and legged mechanisms be modeled through generic joints
  only, or should Solidark provide higher-level mechanism components later?

## References

- ROS URDF is the primary initial robot interchange target:
  https://docs.ros.org/en/kilted/Tutorials/Intermediate/URDF/URDF-Main.html

