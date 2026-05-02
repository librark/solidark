# Solidark Extension Implementation Plan

Status: draft 0.2

Solidark's core should stay focused on declarative CAD geometry. Extension
packages should add domain semantics, artifact packaging, and integration with
external simulation or fabrication systems without making the core library
depend on those systems.

This document proposes a simplified extension architecture for two initial
domains:

- Robot and mechanism design, including URDF export and a JavaScript-native
  Babylon.js simulation path.
- Circuits and boards, including PCB layout, electrical metadata, fabrication
  outputs, and mechanical integration with Solidark models.

Manufacturing handoff should remain mostly file-export driven. Solidark already
exports formats such as STL and STEP, and slicers such as OrcaSlicer can consume
those artifacts directly. Unless a real workflow gap appears, Solidark should
not introduce manufacturing-specific custom elements.

## Context

Solidark already provides a DOM-backed CAD tree, custom elements, an abstract
kernel boundary, browser visualization, and export-oriented evaluated geometry.
Extensions can build on those foundations by adding non-geometric meaning around
the same source tree.

External tools usually need more than a mesh:

- Robot tools need links, joints, frames, collision geometry, visual geometry,
  inertial properties, sensors, actuators, and controllers.
- Browser simulation engines need a scene graph, mesh assets, materials,
  collision shapes, joints, constraints, and behavior metadata.
- Circuit and PCB tools need board outlines, layers, nets, footprints, pads,
  traces, vias, zones, drill data, assembly data, BOM data, and sometimes a 3D
  mechanical representation.

The common problem is correspondence: Solidark needs a reliable way to map a
source component, evaluated geometry, exported mesh, and external-platform node
back to the same modeled object.

## Goals

- Keep robot, robot-simulation, and circuit features in optional extension
  packages.
- Preserve Solidark's plain JavaScript and Web Components authoring model.
- Support fully declarative HTML authoring and class-based `Component` authoring.
- Build a source-to-artifact correspondence model that can survive export.
- Generate deterministic file bundles from a Solidark DOM tree.
- Prefer JavaScript-native browser workflows when they are good enough.
- Keep Node-only workflows possible when external fabrication tools or file
  writers are required.
- Make all extension packages testable with ordinary `node:test` unit tests.
- Avoid coupling the Solidark core to any one simulator, robot stack, PCB editor,
  or fabrication vendor.

## Non-Goals

- Solidark should not become a slicer.
- Solidark should not become a full robot dynamics research simulator.
- Solidark should not become a replacement for KiCad, Babylon.js, ROS, or board
  fabrication software.
- Extensions should not require JSX, React, TypeScript-only APIs, or framework
  coupling.
- Extensions should not put simulation behavior into the CAD kernel adapter.
- Circuit extensions should not make the core CAD model mesh-first or
  electronics-first.
- Solidark should not add manufacturing-specific custom elements until a clear
  modeling need appears.

## Extension Principles

### Optional Packages

Each extension should be importable on demand. Importing `solidark` should not
register robot, simulator, or circuit custom elements.

Potential package families:

- `@solidark/interop`: shared artifact, source-map, validation, and unit helpers.
- `@solidark/robot`: umbrella robot package for users who want all official
  robot extension features.
- `@solidark/robot/definition`: robot links, joints, frames, URDF export, and
  robot package manifests.
- `@solidark/robot/simulation`: simulator-neutral robot simulation metadata.
- `@solidark/robot/simulation/babylon`: Babylon.js scene export, runtime loader
  helpers, and browser simulation support.
- `@solidark/circuit`: circuit and board definition components.
- `@solidark/circuit/kicad`: KiCad project, schematic, board, and footprint
  exporters.
- `@solidark/circuit/gerber`: Gerber, drill, pick-and-place, and fabrication
  exporters.

The first implementation can start with fewer packages, but the boundaries
should remain visible. A monolithic `@solidark/extensions` package would be
convenient for prototyping, but individual packages are better once APIs settle.

### Namespace Model

The two main extension namespaces should be `robot` and `circuit`.

The `robot` namespace should be split into:

- `robot/definition`: robot structure, links, joints, frames, inertials,
  visuals, collisions, URDF export, and robot package manifests.
- `robot/simulation`: simulator-neutral runtime metadata, controllers,
  actuators, sensors, environments, simulation scenes, and target adapters such
  as Babylon.js.

The `circuit` namespace should cover circuit graphs, board layout, footprints,
fabrication exports, assembly data, and mechanical board integration.

### Component Namespacing

Official Solidark extensions may keep the `sol-` prefix, but should include the
domain segment:

- Robot definition: `sol-robot`, `sol-robot-link`, `sol-robot-joint`,
  `sol-robot-frame`, `sol-robot-visual`, `sol-robot-collision`,
  `sol-robot-inertial`.
- Robot simulation: `sol-robot-simulation`, `sol-robot-instance`,
  `sol-robot-world`, `sol-robot-controller`, `sol-robot-actuator`,
  `sol-robot-sensor`, `sol-robot-environment`.
- Circuit: `sol-circuit-board`, `sol-circuit-part`, `sol-circuit-net`,
  `sol-circuit-pad`, `sol-circuit-trace`, `sol-circuit-via`,
  `sol-circuit-zone`.

Third-party extensions should use their own custom element prefixes.

Expected imports:

```js
import '@solidark/robot/definition'
import '@solidark/robot/simulation/babylon'
import '@solidark/circuit'
```

### Geometry Is Not Enough

Extension components may produce no geometry. A joint, net, trace constraint,
component pin, or simulation actuator is semantic data. These components should
still inherit from Solidark's `Component` so they participate in lifecycle,
normalization, diagnostics, and declarative composition.

### External Artifacts Need Source Maps

Every generated external artifact should be traceable back to the Solidark
source tree. This should be represented by a source map that records:

- The Solidark component path.
- A stable source id, such as a `name`, `id`, or generated path id.
- The evaluated geometry id when geometry exists.
- The generated external node id, such as a URDF link name, GLB node name,
  Gerber layer feature id, or KiCad UUID.
- The generated file path and byte or object range where practical.

This source map is the foundation for diagnostics, export validation,
round-tripping, and future viewer selection.

## Shared Extension Runtime

Extensions should share a small runtime layer that knows how to compile a DOM
tree into a bundle of files. This should not know about robots or circuits
directly.

Suggested shape:

```js
export class ExtensionCompiler {
  constructor ({ runtime, kernel, assets, diagnostics } = {}) {}

  async compile (element, options = {}) {
    return {
      files: [],
      sourceMap: [],
      diagnostics: [],
      metadata: {}
    }
  }
}
```

Artifact file entries should be plain objects:

```js
{
  path: 'robot/robot.urdf',
  mediaType: 'application/xml',
  role: 'robot-description',
  content: '<robot name="arm">...</robot>'
}
```

Binary content should be represented by `ArrayBuffer`, `Uint8Array`, or `Blob`
depending on runtime capability. Browser consumers can offer downloads; Node
consumers can write files to disk.

### Shared IR

Each domain should compile to a domain-specific intermediate representation
before writing files:

- Robot definition IR: robots, links, joints, frames, visuals, collisions,
  inertials, and URDF metadata.
- Robot simulation IR: scene nodes, mesh assets, materials, collision shapes,
  constraints, motors, sensors, controllers, and update hooks.
- Circuit IR: boards, stackups, nets, footprints, pads, traces, vias, zones,
  cutouts, BOM entries, and assembly placements.

The shared compiler layer should only provide:

- File manifest handling.
- Source maps.
- Diagnostics.
- Unit conversion helpers.
- Path-safe naming helpers.
- XML, JSON, CSV, and archive writing utilities when useful.

### Core Hooks Needed Later

Some extension functionality may eventually require small core additions:

- Stable normalized-node paths that are included in evaluation output.
- Optional `metadata` on normalized nodes and evaluated shapes.
- Optional evaluated bounds, volume, area, mass-property, and mesh-quality
  queries.
- A standard way to name geometry-producing components for export.
- A standard artifact download helper for browser workflows.

These hooks should be added only when an extension proves that the generic hook
is useful across domains.

## Manufacturing Handoff

Manufacturing should stay simple at this stage. Solidark should provide clean
geometry exports and let dedicated manufacturing software do manufacturing work.

Recommended baseline:

- STL export for slicers and mesh-first additive workflows.
- STEP export for precise CAD handoff.
- GLB export for browser preview and lightweight sharing.
- Optional export manifests that record units, tolerances, mesh settings, source
  mapping, and generated file paths.

Solidark should not add `sol-print-*` components for now. Print plates, material
profiles, support settings, and slicing presets should remain in slicer
software such as OrcaSlicer unless a Solidark workflow later needs them as
source-controlled design data.

Open questions:

- Should Solidark add a single convenience export bundle for STL, STEP, GLB, and
  a manifest?
- Should browser downloads be handled by the core viewer/export UI or by a small
  optional helper package?
- Should source maps be embedded into GLB extras or kept as sidecar JSON files?

## Robot Extension

### Purpose

The robot extension should let users define robots, mechanisms, frames, and
simulation-ready assemblies around Solidark geometry. It should be organized
around two sub-namespaces:

- `robot/definition`: source-of-truth robot structure and interchange.
- `robot/simulation`: JavaScript-native simulation handoff and runtime helpers.

The definition namespace should export URDF first because URDF is widely used in
robot tooling and can also serve as an interchange format for external
simulators.

No dedicated Webots extension is planned for the first iteration. If Webots is
needed later, it can consume URDF exports or be added as a thin adapter after
the URDF exporter is stable.

### Babylon.js as the First Simulation Target

Babylon.js is a reasonable first simulation target for Solidark because it keeps
the workflow in JavaScript and web technologies. It provides a complete browser
scene graph, GLB loading, picking, materials, cameras, and Havok-backed physics.
That makes it a good fit for:

- Visual robot simulation in the browser.
- Mechanism playback and debugging.
- Kinematic previews.
- Constraint-based prototypes.
- Educational and design-review workflows.
- Robots whose behavior can be represented well enough with real-time rigid
  body physics.

Legged mechanisms and five-bar robots are plausible Babylon.js targets for early
Solidark work, especially if Solidark owns the kinematic graph and uses Babylon
for visualization, collision, constraints, and interactive testing.

The limitation is important: Babylon.js is a game and real-time 3D engine, not a
robotics-grade dynamics simulator. It should not be treated as the final answer
for high-fidelity actuator modeling, contact-rich locomotion research,
controller validation, terrain interaction, or hardware-certification physics.
For Solidark's near-term purpose, that is acceptable. The first goal is useful,
testable, browser-native mechanism simulation, not replacing specialized
robotics simulators.

### Definition Namespace Components

```html
<sol-robot name="pan-tilt">
  <sol-robot-link name="base">
    <sol-robot-visual>
      <sol-cylinder radius="20" height="8"></sol-cylinder>
    </sol-robot-visual>
    <sol-robot-collision>
      <sol-cylinder radius="20" height="8"></sol-cylinder>
    </sol-robot-collision>
    <sol-robot-inertial mass="0.12"></sol-robot-inertial>
  </sol-robot-link>

  <sol-robot-link name="yaw">
    <sol-robot-visual>
      <sol-cuboid size="28 18 12"></sol-cuboid>
    </sol-robot-visual>
  </sol-robot-link>

  <sol-robot-joint
    name="base_to_yaw"
    type="revolute"
    parent="base"
    child="yaw"
    origin="0 0 8"
    axis="0 0 1"
    lower="-90"
    upper="90">
  </sol-robot-joint>
</sol-robot>
```

Components:

- `sol-robot`: root robot descriptor.
- `sol-robot-link`: rigid body.
- `sol-robot-joint`: fixed, revolute, continuous, prismatic, floating, or planar
  relationship between two links.
- `sol-robot-frame`: named coordinate frame without mass or geometry.
- `sol-robot-visual`: visual geometry subtree.
- `sol-robot-collision`: collision geometry subtree.
- `sol-robot-inertial`: mass, center of mass, and inertia tensor.
- `sol-robot-limit`: joint limits if separate from the joint component.

### URDF Export

The URDF exporter should generate:

- `robot.urdf`.
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

### Simulation Namespace Components

```html
<sol-robot-simulation target="babylon" mode="kinematic">
  <sol-robot-instance robot="five-bar"></sol-robot-instance>
  <sol-robot-world gravity="0 0 -9.81"></sol-robot-world>
  <sol-robot-controller module="./controllers/five-bar.js"></sol-robot-controller>
  <sol-robot-actuator joint="left_crank" kind="motor"></sol-robot-actuator>
  <sol-robot-actuator joint="right_crank" kind="motor"></sol-robot-actuator>
</sol-robot-simulation>
```

Components:

- `sol-robot-simulation`: simulation scenario root.
- `sol-robot-instance`: a named robot definition placed into a scenario.
- `sol-robot-world`: gravity, ground, lighting, and world-scale metadata.
- `sol-robot-controller`: declarative controller metadata or JavaScript module
  references.
- `sol-robot-actuator`: motors, servos, or other joint drivers.
- `sol-robot-sensor`: camera, lidar, imu, force, distance, or contact sensors.
- `sol-robot-environment`: terrain, obstacles, and test fixtures.

### Babylon.js Handoff

Babylon.js integration should focus on browser simulation and visualization, not
CAD editing.

Initial export should generate:

- GLB mesh assets.
- A JSON scene descriptor with Solidark source ids, robot links, joints,
  materials, inertials, collision shapes, sensors, and actuators.
- A loader helper that creates Babylon.js meshes, transform nodes, physics
  bodies, and constraints.

Solidark should use GLB as the primary geometry handoff and keep robot semantics
in a companion JSON document unless a glTF extension is justified later.

The Babylon adapter should support two modes:

- Kinematic mode: Solidark controls joint transforms directly. This is the best
  first target for five-bar mechanisms and deterministic mechanism playback.
- Physics mode: Babylon/Havok manages rigid bodies and constraints. This is
  useful for collision, falling, contact experiments, and interactive tests, but
  may need tuning for complex legged robots.

### Robot Validation

The robot definition compiler should report:

- Duplicate link, joint, or frame names.
- Missing joint parents or children.
- Cycles in the link-joint graph.
- Geometry assigned directly to `sol-robot` without a link.
- Links with visual geometry but no collision geometry when a simulation export
  requires collision.
- Missing mass or inertia when dynamics export is requested.
- Unit conversion and axis conversion assumptions.
- Meshes that are too detailed for collision use.

The robot simulation compiler should report:

- Duplicate sensor, actuator, controller, or environment names.
- Controllers that target missing joints or links.
- Actuators attached to unsupported joint types.
- Sensors attached to missing links or frames.
- Simulation modes that the selected target cannot support.
- Meshes that are too detailed for real-time collision use.
- Unsupported joint types for the selected simulation target.

### Open Questions

- Should mass properties be explicitly authored first, computed from geometry
  first, or both?
- Should collision simplification be implemented in Solidark or delegated to
  external mesh tooling?
- Should the robot definition namespace include Xacro generation, or should plain
  URDF come first?
- How should sensors and actuators be represented before a specific simulator
  target is selected?
- Should five-bar robots and legged mechanisms be modeled through generic joints
  only, or should Solidark provide higher-level mechanism components later?

## Circuit Extension

### Purpose

The circuit extension should let Solidark describe electronic assemblies using
the same declarative component style as mechanical CAD. It should learn from
tscircuit's React-based component model while staying aligned with Solidark's
plain JavaScript and Web Components constraints.

The circuit extension should not be a thin wrapper around 3D geometry. A board
is part geometry, part circuit graph, part manufacturing package, and part
assembly description. The extension should own a circuit-specific IR and use
Solidark CAD geometry for board outlines, enclosures, component 3D previews,
keepouts, and mechanical fit checks.

The package should be named around circuits rather than only PCBs because the
source model should eventually cover the logical circuit, board layout,
assembly, and mechanical representation.

### Initial Components

```html
<sol-circuit-board name="controller" size="60 35" thickness="1.6" layers="2">
  <sol-circuit-net name="GND"></sol-circuit-net>
  <sol-circuit-net name="VBUS"></sol-circuit-net>

  <sol-circuit-part
    name="J1"
    kind="usb-c"
    footprint="usb-c-16p"
    at="-22 0"
    rotation="90">
  </sol-circuit-part>

  <sol-circuit-part
    name="R1"
    kind="resistor"
    footprint="0603"
    value="1k"
    at="8 6">
  </sol-circuit-part>

  <sol-circuit-trace from="J1.VBUS" to="R1.1" width="0.25"></sol-circuit-trace>
  <sol-circuit-zone net="GND" layer="bottom"></sol-circuit-zone>
</sol-circuit-board>
```

Core component groups:

- Board structure: `sol-circuit-board`, `sol-circuit-stackup`,
  `sol-circuit-layer`.
- Electrical graph: `sol-circuit-net`, `sol-circuit-port`,
  `sol-circuit-subcircuit`.
- Parts: `sol-circuit-part`, `sol-circuit-symbol`, `sol-circuit-footprint`.
- Footprint primitives: `sol-circuit-pad`, `sol-circuit-via`,
  `sol-circuit-hole`, `sol-circuit-courtyard`, `sol-circuit-silkscreen`,
  `sol-circuit-fabrication`.
- Routing: `sol-circuit-trace`, `sol-circuit-arc-trace`, `sol-circuit-zone`,
  `sol-circuit-keepout`.
- Mechanical integration: `sol-circuit-cutout`, `sol-circuit-mounting-hole`,
  `sol-circuit-edge`, `sol-circuit-component-body`.
- Manufacturing metadata: `sol-circuit-bom`, `sol-circuit-assembly-note`,
  `sol-circuit-supplier-part`.

### Circuit IR

The circuit compiler should produce an IR with:

- Board outline and stackup.
- Layer definitions.
- Netlist.
- Component instances.
- Footprint instances.
- Pads, vias, holes, traces, fills, zones, and keepouts.
- Schematic symbols and net labels when schematic export is enabled.
- BOM entries.
- Pick-and-place placements.
- 3D component placements and board solid preview.
- Source map entries.

The IR should be deterministic and serializable so tests can assert it without
requiring a PCB editor.

### CAD Integration

Solidark's geometry kernel can provide circuit value in several places:

- Board outlines from sketches, faces, offsets, and mechanical constraints.
- Enclosure and board co-design through shared mounting holes, bosses,
  standoffs, and connector cutouts.
- Keepout volumes for tall components, batteries, heatsinks, and connectors.
- 3D preview of assembled boards in the CAD viewer.
- Collision checks between board assemblies and mechanical enclosures.
- Export of board and component solids to GLB or STEP for mechanical review.

The circuit extension should support both 2D layout data and 3D representation.
The 2D layout should remain authoritative for fabrication.

### Export Targets

Initial exports:

- Gerber X2 layer files.
- XNC or Excellon-compatible drill data, depending on chosen implementation
  path.
- Gerber job file where supported.
- BOM as CSV and JSON.
- Pick-and-place as CSV.
- GLB preview of the assembled board.
- Solidark circuit manifest with source mapping and DRC diagnostics.

KiCad exports should be a high-priority target:

- `.kicad_pro` project file.
- `.kicad_sch` schematic file where schematic data exists.
- `.kicad_pcb` board file.
- `.kicad_mod` footprint files for generated footprints.

KiCad uses documented S-expression formats for schematic and board files, which
makes it a practical review and editing target once the circuit IR is stable.

Later exports:

- IPC-2581 or IPC-DPMX for richer manufacturing exchange.
- Circuit JSON compatibility if it makes interoperability with tscircuit useful.
- SPICE netlists for circuit simulation.
- STEP export of assembled boards for mechanical CAD handoff.

### Routing Strategy

Routing should be staged:

- Phase 1: explicit manual traces only.
- Phase 2: simple constraint validation and ratsnest diagnostics.
- Phase 3: external autorouter adapter.
- Phase 4: optional built-in lightweight routing for simple boards if demand
  justifies it.

Solidark should not start by implementing a full autorouter. The early circuit
work should make board description, footprint placement, mechanical integration,
and fabrication exports reliable before optimizing trace generation.

### Circuit Validation

The circuit compiler should report:

- Duplicate reference designators.
- Missing footprints.
- Unknown nets or pin references.
- Unconnected required pins.
- Trace width or clearance violations.
- Via diameter and annular ring violations.
- Copper too close to board edge or cutouts.
- Silkscreen over exposed pads.
- Courtyard collisions.
- Missing BOM fields for assembly export.
- Component height violations against declared keepout volumes.
- Board outline self-intersections or unsupported curves for a given exporter.

### Open Questions

- Should the first circuit authoring model require explicit footprints, or
  should common parts have built-in footprint defaults?
- Should schematic capture be first-class in the first circuit release, or
  should layout/netlist come first?
- Should the circuit extension interoperate with tscircuit by importing or
  exporting Circuit JSON?
- Should supplier metadata be generic or should adapters exist for JLCPCB,
  Digi-Key, Mouser, and other vendors?
- Should KiCad export come before direct Gerber generation to gain an immediate
  review workflow?

## Cross-Domain Assemblies

The long-term value of these extensions is electromechanical co-design. A robot
or product should be able to contain mechanical CAD, boards, wiring, motors,
sensors, and fabrication outputs in one source tree.

Example:

```html
<sol-robot name="line-follower">
  <sol-robot-link name="chassis">
    <sol-robot-visual>
      <robot-chassis></robot-chassis>
    </sol-robot-visual>
  </sol-robot-link>

  <sol-circuit-board name="controller" at="0 0 14">
    <sol-circuit-part name="U1" kind="microcontroller" footprint="qfn-32"></sol-circuit-part>
    <sol-circuit-part name="M1" kind="motor-driver" footprint="soic-8"></sol-circuit-part>
  </sol-circuit-board>

  <sol-robot-joint
    name="left_wheel_joint"
    type="continuous"
    parent="chassis"
    child="left_wheel"
    axis="0 1 0">
  </sol-robot-joint>
</sol-robot>
```

This raises integration requirements:

- A board can be a physical object in a robot link.
- A connector can be both a circuit footprint and a robot/electromechanical
  interface.
- A motor can have CAD geometry, electrical pins, a URDF joint, and simulation
  actuator metadata.
- A source map must allow one component to contribute to several external files.
- Units and coordinate frames must be explicit at every domain boundary.

## Implementation Phases

### Phase 0: Shared Extension Substrate

- Define the extension artifact manifest.
- Define source-map entry structure.
- Add or prototype metadata propagation from DOM nodes to exported artifacts.
- Add XML, JSON, CSV, and archive writer utilities where needed.
- Add deterministic naming utilities.
- Add tests for file manifests, source maps, diagnostics, and unit conversion.

Exit criteria:

- A trivial extension can compile a Solidark DOM tree into multiple files.
- Generated files include source-map metadata.
- The extension runtime works in browser-like tests and Node tests.

### Phase 1: Robot Definition and URDF Export

- Implement robot definition components for robot, link, joint, visual,
  collision, and inertial metadata.
- Generate URDF and mesh assets.
- Validate link-joint graph structure.
- Convert units and angles explicitly.
- Add sample robots to the showcase.

Exit criteria:

- A two-link revolute mechanism exports to URDF.
- Visual and collision geometry are exported separately.
- Source map entries connect Solidark components to URDF links and joints.

### Phase 2: Robot Simulation with Babylon.js

- Implement robot simulation components for simulation scenarios, worlds,
  controllers, actuators, sensors, and environments.
- Add Babylon.js scene descriptor and loader helper.
- Preserve source ids in GLB node names or companion metadata.
- Support kinematic joint playback first.
- Add optional Babylon/Havok physics bodies and constraints.
- Add a browser showcase for a simple five-bar mechanism or leg module.

Exit criteria:

- A Solidark robot can be loaded into a Babylon.js scene with link metadata.
- A simple mechanism can be animated through declarative joint definitions.
- Physics mode can be enabled for a small rigid-body example.

### Phase 3: Circuit IR and Board Preview

- Implement circuit component classes.
- Compile circuit DOM trees into a deterministic circuit IR.
- Render 2D board data into a preview-friendly structure.
- Generate a 3D board preview using Solidark geometry.
- Add DRC diagnostics for the first simple rules.

Exit criteria:

- A simple two-layer board with parts, nets, and manual traces can be compiled.
- The board has both a circuit IR and a 3D Solidark preview model.

### Phase 4: Circuit Fabrication and KiCad Export

- Generate Gerber layer files and drill files.
- Generate BOM and pick-and-place files.
- Generate KiCad board/project files from circuit IR.
- Add board export examples to the showcase.

Exit criteria:

- A simple board can be reviewed in KiCad.
- A fabrication archive can be produced with Gerber, drill, BOM, and placement
  outputs.

### Phase 5: Cross-Domain Workflows

- Allow circuit boards to mount into robot links or mechanical assemblies.
- Add connector, motor, sensor, and mounting-hole correspondence helpers.
- Add checks for board-to-enclosure and robot-to-board mechanical conflicts.
- Add multi-artifact project export.

Exit criteria:

- One source tree can generate mechanical preview assets, circuit fabrication
  files, and robot simulation files with shared source mapping.

## Testing Strategy

Every source file in an extension package should have a colocated unit test.
Extensions should aim for 100% coverage, matching Solidark core expectations.

Recommended test layers:

- Component registration and property parsing tests.
- DOM-to-IR compiler tests.
- Unit conversion tests.
- Source-map stability tests.
- Export writer snapshot tests for small deterministic examples.
- Validation diagnostic tests.
- Optional integration tests for external command-line tools, skipped unless the
  tool is explicitly available.

External tool adapters should not be required for normal unit tests. They should
be covered by command construction tests and small opt-in integration tests.

## Risks

- Babylon.js is a strong browser simulation target, but it is not a specialized
  robot simulator. Simulation claims should be scoped to what can be validated.
- Unit mismatches are likely across CAD, URDF, circuit formats, and simulation
  engines. Every exporter must state its unit conversions.
- Mesh handoff can lose B-Rep precision. CAD source should remain authoritative.
- Circuit design is its own domain. The extension should avoid overpromising
  autorouting and focus first on deterministic data structures and exports.
- Source maps can become fragile if names are implicit. Extensions should
  encourage explicit names for exported objects.
- Browser workflows and Node workflows have different capabilities. Package
  entrypoints should keep those environments separate.

## Reference Targets

- tscircuit demonstrates a component-based electronics workflow that can produce
  PCB, schematic, 3D preview, BOM, autorouting, and fabrication outputs:
  https://docs.tscircuit.com/
- ROS URDF is the primary initial robot interchange target:
  https://docs.ros.org/en/kilted/Tutorials/Intermediate/URDF/URDF-Main.html
- Babylon.js supports browser 3D scenes, GLB import, picking, materials,
  cameras, and Havok-backed physics:
  https://www.babylonjs.com/specifications/
- Gerber is the primary PCB fabrication data transfer target:
  https://www.ucamco.com/en/gerber
- KiCad's documented S-expression board and schematic formats make it a strong
  review and editing target:
  https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/
