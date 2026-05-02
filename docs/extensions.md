# Solidark Extension Implementation Plan

Status: draft 0.1

Solidark's core should stay focused on declarative CAD geometry. Extension
packages should add domain semantics, artifact packaging, and integration with
external manufacturing or simulation systems without making the core library
depend on those systems.

This document proposes an extension architecture for two initial domains:

- Mechanical and robotic systems, including manufacturing handoff, URDF export,
  Webots handoff, and Babylon.js scene handoff.
- Electronic systems, including PCB layout, circuit metadata, fabrication
  outputs, and mechanical integration with Solidark models.

The intent is to let Solidark remain a precise geometry authoring library while
making it practical to design things that will become robots, enclosures,
fixtures, mechanisms, circuit boards, and complete electromechanical assemblies.

## Context

Solidark already provides a DOM-backed CAD tree, custom elements, an abstract
kernel boundary, browser visualization, and export-oriented evaluated geometry.
Extensions can build on those foundations by adding non-geometric meaning around
the same source tree.

External tools usually need more than a mesh:

- Slicers need printable meshes, units, build placement, material/process
  settings, and sometimes 3MF metadata.
- Robot simulators need links, joints, frames, collision geometry, visual
  geometry, inertial properties, sensors, actuators, and controllers.
- Browser simulation engines need a scene graph, mesh assets, materials,
  collision shapes, and behavior metadata.
- PCB tools need board outlines, layers, nets, footprints, pads, traces, vias,
  zones, drill data, assembly data, BOM data, and sometimes a 3D mechanical
  representation.

The common problem is correspondence: Solidark needs a reliable way to map a
source component, evaluated geometry, exported mesh, and external-platform node
back to the same modeled object.

## Goals

- Keep robotics, manufacturing, simulation, and PCB features in optional
  extension packages.
- Preserve Solidark's plain JavaScript and Web Components authoring model.
- Support fully declarative HTML authoring and class-based `Component` authoring.
- Build a source-to-artifact correspondence model that can survive export.
- Generate deterministic file bundles from a Solidark DOM tree.
- Keep browser-only workflows possible when external command-line tools are not
  required.
- Keep Node-only workflows possible when a slicer, KiCad, or simulator CLI must
  be launched.
- Make all extension packages testable with ordinary `node:test` unit tests.
- Avoid coupling the Solidark core to any one slicer, simulator, robot stack, or
  PCB design tool.

## Non-Goals

- Solidark should not become a slicer.
- Solidark should not become a full robot dynamics simulator.
- Solidark should not become a replacement for KiCad, Webots, Babylon.js, ROS,
  or board fabrication software.
- Extensions should not require JSX, React, TypeScript-only APIs, or framework
  coupling.
- Extensions should not put manufacturing or simulation behavior into the CAD
  kernel adapter.
- PCB extensions should not make the core CAD model mesh-first or
  electronics-first.

## Extension Principles

### Optional Packages

Each extension should be importable on demand. Importing `solidark` should not
register robotics, slicer, simulator, or PCB custom elements.

Potential package families:

- `@solidark/interop`: shared artifact, source-map, validation, and unit helpers.
- `@solidark/manufacturing`: additive manufacturing exports and slicer adapters.
- `@solidark/robotics`: robot links, joints, frames, URDF export, and robot
  package manifests.
- `@solidark/webots`: Webots-specific PROTO, world, or project handoff helpers.
- `@solidark/babylon`: Babylon.js scene export and runtime loader helpers.
- `@solidark/pcb`: circuit and board definition components.
- `@solidark/kicad`: KiCad project, schematic, board, and footprint exporters.
- `@solidark/gerber`: Gerber, drill, pick-and-place, and fabrication exporters.

The first implementation can start with fewer packages, but the boundaries
should remain visible. A monolithic `@solidark/extensions` package would be
convenient for prototyping, but individual packages are better once APIs settle.

### Component Namespacing

Official Solidark extensions may keep the `sol-` prefix, but should include a
domain segment to avoid collisions:

- Robotics: `sol-robot`, `sol-robot-link`, `sol-robot-joint`,
  `sol-robot-frame`, `sol-robot-visual`, `sol-robot-collision`.
- Manufacturing: `sol-print-job`, `sol-print-plate`, `sol-print-profile`,
  `sol-print-support`.
- PCB: `sol-pcb-board`, `sol-pcb-part`, `sol-pcb-net`, `sol-pcb-pad`,
  `sol-pcb-trace`, `sol-pcb-via`, `sol-pcb-zone`.

Third-party extensions should use their own custom element prefixes.

### Geometry Is Not Enough

Extension components may produce no geometry. A joint, net, trace constraint,
component pin, or print profile is semantic data. These components should still
inherit from Solidark's `Component` so they participate in lifecycle,
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
tree into a bundle of files. This should not know about robots or PCBs directly.

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

- Manufacturing IR: parts, mesh assets, build plates, materials, process
  profiles, slicer targets.
- Robotics IR: robots, links, joints, frames, visuals, collisions, inertials,
  sensors, actuators.
- PCB IR: boards, stackups, nets, footprints, pads, traces, vias, zones,
  cutouts, BOM entries, assembly placements.

The shared compiler layer should only provide:

- File manifest handling.
- Source maps.
- Diagnostics.
- Unit conversion helpers.
- Path-safe naming helpers.
- XML, JSON, and archive writing utilities when useful.

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

## Manufacturing Extension

### Purpose

The manufacturing extension should prepare Solidark models for additive
manufacturing and hand them to external slicer software. It should not implement
toolpath generation itself.

### Initial Components

```html
<sol-print-job name="bracket" unit="mm">
  <sol-print-profile
    process="fff"
    material="pla"
    layer-height="0.2"
    nozzle-diameter="0.4">
  </sol-print-profile>

  <sol-print-plate size="220 220 250">
    <sol-model id="part">
      <sol-cuboid size="80 40 8"></sol-cuboid>
    </sol-model>
  </sol-print-plate>
</sol-print-job>
```

The print components should describe manufacturing intent, not geometry. The
actual printable geometry remains a Solidark model.

### Export Targets

Initial export targets:

- STL for maximum slicer compatibility and simple mesh-only workflows.
- 3MF for modern additive workflows that need units, multiple objects, colors,
  materials, thumbnails, and richer package metadata.
- GLB preview assets for browser review before slicing.
- A Solidark print manifest that records generated files, source mapping,
  units, tolerances, mesh quality, and slicer profile references.

3MF should become the preferred rich additive export. STL should remain a
fallback because it is widely accepted, but it loses units, materials, colors,
and assembly semantics.

### Slicer Adapters

Slicer integration should be adapter-based:

```js
import { createPrintBundle } from '@solidark/manufacturing'
import { PrusaSlicerAdapter } from '@solidark/manufacturing/prusaslicer'

const bundle = await createPrintBundle(model, {
  format: '3mf',
  profile: 'pla-0.2'
})

const result = await new PrusaSlicerAdapter({
  executable: 'prusa-slicer'
}).slice(bundle)
```

Adapters should be optional and runtime-specific. Browser builds can generate
STL or 3MF downloads. Node builds can call local command-line tools when the
user has installed them.

Potential adapters:

- PrusaSlicer and SuperSlicer through their command-line interfaces.
- CuraEngine for G-code generation where a direct engine workflow is useful.
- Bambu Studio or OrcaSlicer later if their CLI behavior is stable enough.

### Manufacturing Validation

The extension should provide diagnostics before generating files:

- Mesh is watertight.
- Triangle normals are consistently oriented.
- Model has nonzero volume.
- Bounds fit the declared build volume.
- Minimum wall thickness is above a profile-defined threshold where practical.
- Unsupported overhangs are reported where practical.
- Very small holes, slivers, or disconnected shells are reported.
- Unit conversion is explicit in the manifest.

### Open Questions

- Which slicer should be supported first in Node workflows?
- Should Solidark store slicer profiles as plain JSON or import existing slicer
  profile formats?
- Should 3MF writing be implemented directly or through a small archive/XML
  utility package?
- Should print metadata live only in `@solidark/manufacturing`, or should some
  material metadata be shared with robotics and PCB exports?

## Robotics Extension

### Purpose

The robotics extension should let users define robots, mechanisms, frames, and
simulation-ready assemblies around Solidark geometry. The extension should
export URDF first because URDF is widely used in ROS tooling and Webots can
import URDF-based models.

### Initial Components

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
- `sol-robot-sensor`: semantic placeholder for camera, lidar, imu, force, or
  distance sensors.
- `sol-robot-actuator`: semantic placeholder for motors, servos, or drivers.

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

### Webots Handoff

The first Webots path should be URDF-based because that keeps the exporter small
and aligns with Webots support for importing CAD models from URDF.

Later Webots-specific exports may add:

- `.wbt` world files for complete scenes.
- `.proto` files for reusable robot definitions.
- Webots sensor and actuator nodes.
- Controller scaffolding.
- Webots project bundle layout.

Webots-specific code should live in `@solidark/webots`, not in the robotics
core package. The robotics package should describe robots; simulator packages
should describe how a robot is handed to a given simulator.

### Babylon.js Handoff

Babylon.js integration should focus on browser simulation and visualization,
not CAD editing.

Initial export should generate:

- GLB mesh assets.
- A JSON scene descriptor with Solidark source ids, robot links, joints,
  materials, and optional collision shapes.
- A loader helper that creates Babylon.js meshes and transform nodes.

Babylon.js already has strong support for importing glTF/GLB, STL, OBJ, and
Babylon scene formats. Solidark should therefore use GLB as the primary geometry
handoff and keep robot semantics in a companion JSON document unless a glTF
extension is justified later.

### Robotics Validation

The robotics compiler should report:

- Duplicate link, joint, frame, sensor, or actuator names.
- Missing joint parents or children.
- Cycles in the link-joint graph.
- Geometry assigned directly to `sol-robot` without a link.
- Links with visual geometry but no collision geometry when a simulation export
  requires collision.
- Missing mass or inertia when dynamics export is requested.
- Unit conversion and axis conversion assumptions.
- Meshes that are too detailed for collision use.

### Open Questions

- Should mass properties be explicitly authored first, computed from geometry
  first, or both?
- Should collision simplification be implemented in Solidark or delegated to
  external mesh tooling?
- Should the robotics extension include Xacro generation, or should plain URDF
  come first?
- How should sensors and actuators be represented before a specific simulator
  target is selected?

## PCB Extension

### Purpose

The PCB extension should let Solidark describe electronic assemblies using the
same declarative component style as mechanical CAD. It should learn from
tscircuit's React-based component model while staying aligned with Solidark's
plain JavaScript and Web Components constraints.

The PCB extension should not be a thin wrapper around 3D geometry. A board is
part geometry, part circuit graph, part manufacturing package, and part assembly
description. The extension should own a PCB-specific IR and use Solidark CAD
geometry for board outlines, enclosures, component 3D previews, keepouts, and
mechanical fit checks.

### Initial Components

```html
<sol-pcb-board name="controller" size="60 35" thickness="1.6" layers="2">
  <sol-pcb-net name="GND"></sol-pcb-net>
  <sol-pcb-net name="VBUS"></sol-pcb-net>

  <sol-pcb-part
    name="J1"
    kind="usb-c"
    footprint="usb-c-16p"
    at="-22 0"
    rotation="90">
  </sol-pcb-part>

  <sol-pcb-part
    name="R1"
    kind="resistor"
    footprint="0603"
    value="1k"
    at="8 6">
  </sol-pcb-part>

  <sol-pcb-trace from="J1.VBUS" to="R1.1" width="0.25"></sol-pcb-trace>
  <sol-pcb-zone net="GND" layer="bottom"></sol-pcb-zone>
</sol-pcb-board>
```

Core component groups:

- Board structure: `sol-pcb-board`, `sol-pcb-stackup`, `sol-pcb-layer`.
- Electrical graph: `sol-pcb-net`, `sol-pcb-port`, `sol-pcb-subcircuit`.
- Parts: `sol-pcb-part`, `sol-pcb-symbol`, `sol-pcb-footprint`.
- Footprint primitives: `sol-pcb-pad`, `sol-pcb-via`, `sol-pcb-hole`,
  `sol-pcb-courtyard`, `sol-pcb-silkscreen`, `sol-pcb-fabrication`.
- Routing: `sol-pcb-trace`, `sol-pcb-arc-trace`, `sol-pcb-zone`,
  `sol-pcb-keepout`.
- Mechanical integration: `sol-pcb-cutout`, `sol-pcb-mounting-hole`,
  `sol-pcb-edge`, `sol-pcb-component-body`.
- Manufacturing metadata: `sol-pcb-bom`, `sol-pcb-assembly-note`,
  `sol-pcb-supplier-part`.

### PCB IR

The PCB compiler should produce an IR with:

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

Solidark's geometry kernel can provide PCB value in several places:

- Board outlines from sketches, faces, offsets, and mechanical constraints.
- Enclosure and PCB co-design through shared mounting holes, bosses, standoffs,
  and connector cutouts.
- Keepout volumes for tall components, batteries, heatsinks, and connectors.
- 3D preview of assembled boards in the CAD viewer.
- Collision checks between board assemblies and mechanical enclosures.
- Export of board and component solids to GLB or STEP for mechanical review.

The PCB extension should support both 2D layout data and 3D representation. The
2D layout should remain authoritative for fabrication.

### Export Targets

Initial exports:

- Gerber X2 layer files.
- XNC or Excellon-compatible drill data, depending on chosen implementation
  path.
- Gerber job file where supported.
- BOM as CSV and JSON.
- Pick-and-place as CSV.
- GLB preview of the assembled board.
- Solidark PCB manifest with source mapping and DRC diagnostics.

KiCad exports should be a high-priority second target:

- `.kicad_pro` project file.
- `.kicad_sch` schematic file where schematic data exists.
- `.kicad_pcb` board file.
- `.kicad_mod` footprint files for generated footprints.

KiCad uses documented S-expression formats for schematic and board files, which
makes it a practical review and editing target once the PCB IR is stable.

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

Solidark should not start by implementing a full autorouter. The early PCB work
should make board description, footprint placement, mechanical integration, and
manufacturing exports reliable before optimizing trace generation.

### PCB Validation

The PCB compiler should report:

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

- Should the first PCB authoring model require explicit footprints, or should
  common parts have built-in footprint defaults?
- Should schematic capture be first-class in the first PCB release, or should
  layout/netlist come first?
- Should the PCB extension interoperate with tscircuit by importing or exporting
  Circuit JSON?
- Should supplier metadata be generic or should adapters exist for JLCPCB,
  Digi-Key, Mouser, and other vendors?
- Should KiCad export come before direct Gerber generation to gain an immediate
  review workflow?

## Cross-Domain Assemblies

The long-term value of these extensions is electromechanical co-design. A robot
or product should be able to contain mechanical CAD, boards, wiring, motors,
sensors, and manufacturing outputs in one source tree.

Example:

```html
<sol-robot name="line-follower">
  <sol-robot-link name="chassis">
    <sol-robot-visual>
      <robot-chassis></robot-chassis>
    </sol-robot-visual>
  </sol-robot-link>

  <sol-pcb-board name="controller" at="0 0 14">
    <sol-pcb-part name="U1" kind="microcontroller" footprint="qfn-32"></sol-pcb-part>
    <sol-pcb-part name="M1" kind="motor-driver" footprint="soic-8"></sol-pcb-part>
  </sol-pcb-board>

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
- A connector can be both a PCB footprint and a robot/electromechanical
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

### Phase 1: Manufacturing Bundle

- Generate STL and 3MF from evaluated Solidark models.
- Generate a print manifest.
- Add mesh validation diagnostics.
- Add build-plate and print-profile components.
- Add browser download helpers.
- Add one Node slicer adapter behind an optional package entrypoint.

Exit criteria:

- A Solidark model can become a 3MF bundle with units and source mapping.
- A Node workflow can invoke one configured slicer and collect generated G-code.

### Phase 2: Robotics URDF Export

- Implement robotics components for robot, link, joint, visual, collision, and
  inertial metadata.
- Generate URDF and mesh assets.
- Validate link-joint graph structure.
- Convert units and angles explicitly.
- Add sample robots to the showcase.

Exit criteria:

- A two-link revolute mechanism exports to URDF.
- Visual and collision geometry are exported separately.
- Source map entries connect Solidark components to URDF links and joints.

### Phase 3: Webots and Babylon.js Adapters

- Add Webots project bundle generation around URDF assets.
- Add optional Webots PROTO or world export if URDF-only handoff is too limited.
- Add Babylon.js scene descriptor and loader helper.
- Preserve source ids in GLB node names or companion metadata.

Exit criteria:

- A Solidark robot can be opened or imported into Webots through generated files.
- A Solidark robot can be loaded into a Babylon.js scene with link metadata.

### Phase 4: PCB IR and Board Preview

- Implement PCB component classes.
- Compile PCB DOM trees into a deterministic PCB IR.
- Render 2D board data into a preview-friendly structure.
- Generate a 3D board preview using Solidark geometry.
- Add DRC diagnostics for the first simple rules.

Exit criteria:

- A simple two-layer board with parts, nets, and manual traces can be compiled.
- The board has both a PCB IR and a 3D Solidark preview model.

### Phase 5: PCB Fabrication and KiCad Export

- Generate Gerber layer files and drill files.
- Generate BOM and pick-and-place files.
- Generate KiCad board/project files from PCB IR.
- Add board export examples to the showcase.

Exit criteria:

- A simple board can be reviewed in KiCad.
- A fabrication archive can be produced with Gerber, drill, BOM, and placement
  outputs.

### Phase 6: Cross-Domain Workflows

- Allow PCB boards to mount into robot links or mechanical assemblies.
- Add connector, motor, sensor, and mounting-hole correspondence helpers.
- Add checks for board-to-enclosure and robot-to-board mechanical conflicts.
- Add multi-artifact project export.

Exit criteria:

- One source tree can generate mechanical preview assets, PCB fabrication files,
  and robot simulation files with shared source mapping.

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

- Unit mismatches are likely across CAD, URDF, slicers, PCB formats, and
  simulation engines. Every exporter must state its unit conversions.
- Mesh handoff can lose B-Rep precision. CAD source should remain authoritative.
- External command-line tools change behavior and licensing. Adapters should be
  optional and isolated.
- PCB design is its own domain. The extension should avoid overpromising
  autorouting and focus first on deterministic data structures and exports.
- Source maps can become fragile if names are implicit. Extensions should
  encourage explicit names for exported objects.
- Browser workflows and Node workflows have different capabilities. Package
  entrypoints should keep those environments separate.

## Reference Targets

- tscircuit demonstrates a component-based electronics workflow that can produce
  PCB, schematic, 3D preview, BOM, autorouting, and fabrication outputs:
  https://docs.tscircuit.com/
- ROS URDF is the primary initial robotics interchange target:
  https://docs.ros.org/en/kilted/Tutorials/Intermediate/URDF/URDF-Main.html
- Webots is an open source robot simulator that can import CAD models from URDF:
  https://www.cyberbotics.com/
- Babylon.js supports browser 3D scenes and imports glTF/GLB, STL, OBJ, and
  Babylon formats:
  https://www.babylonjs.com/specifications/
- 3MF is the preferred rich additive manufacturing package target:
  https://3mf.io/spec/
- Gerber is the primary PCB fabrication data transfer target:
  https://www.ucamco.com/en/gerber
- KiCad's documented S-expression board and schematic formats make it a strong
  review and editing target:
  https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/
