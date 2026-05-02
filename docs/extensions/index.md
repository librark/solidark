# Solidark Extension Architecture

Status: draft 0.4

Solidark's core should stay focused on declarative CAD geometry. Extension
packages should add domain semantics, artifact packaging, and integration with
external robot, simulation, or fabrication systems without making the core
library depend on those systems.

This document is the umbrella architecture for Solidark extensions. Domain
details live in:

- [Robot Specification](./robot-specification.md)
- [Circuit Specification](./circuit-specification.md)

## Extension Domains

The first two official extension domains should be:

- `@solidark/robot`: robot and mechanism definition, including links, joints,
  inertials, sensors, actuators, URDF export, engine-neutral JSON robot
  descriptions, mesh assets, and robot package manifests.
- `@solidark/circuit`: circuit and board definition, including board layout,
  nets, footprints, pads, traces, vias, automatic routing, fabrication outputs,
  KiCad export, Gerber export, and circuit package manifests.

Both namespaces should be flat at the public package level:

```js
import '@solidark/robot'
import '@solidark/circuit'
```

Internal modules may still be organized by concern. For example, circuit
format-specific writers such as KiCad and Gerber should live under an internal
`circuits/external` implementation directory, mirroring the way the base
library keeps STEP, STL, and similar file-format concerns outside primitive
modeling components.

## Goals

- Keep robot and circuit features in optional extension packages.
- Preserve Solidark's plain JavaScript and Web Components authoring model.
- Support fully declarative HTML authoring and class-based `Component` authoring.
- Build a source-to-artifact correspondence model that can survive export.
- Generate deterministic file bundles from a Solidark DOM tree.
- Prefer JavaScript-friendly data handoff when browser workflows are useful.
- Keep Node-only workflows possible when external fabrication tools or file
  writers are required.
- Make all extension packages testable with ordinary `node:test` unit tests.
- Avoid coupling the Solidark core to any one simulation engine, robot stack,
  PCB editor, or fabrication vendor.

## Non-Goals

- Solidark should not become a slicer.
- Solidark should not become a full robot dynamics research simulator.
- Solidark should not become a replacement for KiCad, ROS, simulation engines,
  or board fabrication software.
- Extensions should not require JSX, React, TypeScript-only APIs, or framework
  coupling.
- Extensions should not put simulation behavior into the CAD kernel adapter.
- Solidark should not depend on Babylon.js or any other simulation engine.
- Solidark should not add manufacturing-specific custom elements until a clear
  modeling need appears.

## Component Namespacing

Official Solidark extensions may keep the `sol-` prefix, but should include the
domain segment:

- Robot components use `sol-robot-*` names, with `sol-robot` as the root robot
  descriptor.
- Circuit components use `sol-circuit-*` names, with `sol-circuit-board` as the
  likely root board descriptor.

Third-party extensions should use their own custom element prefixes.

## Semantic Components

Extension components may produce no geometry. A joint, net, trace constraint,
component pin, actuator, or sensor is semantic data. These components should
still inherit from Solidark's `Component` so they participate in lifecycle,
normalization, diagnostics, and declarative composition.

Geometry-producing children should remain regular Solidark geometry whenever
possible. For example, a robot visual body can contain core `sol-cuboid` or a
custom mechanical component, and a circuit board outline can be derived from
Solidark sketches or geometry.

## Artifact Bundles

Extensions should compile DOM trees into artifact bundles. A bundle should be a
plain object that is easy to test, inspect, download in a browser, or write to
disk in Node.

Suggested file entry shape:

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

## Source Maps

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

## Shared Runtime

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

Each domain should compile to a domain-specific intermediate representation
before writing files:

- Robot IR: robots, links, joints, frames, visuals, collisions, inertials,
  sensors, actuators, mesh assets, URDF metadata, and JSON export metadata.
- Circuit IR: boards, stackups, nets, footprints, pads, traces, vias, zones,
  cutouts, BOM entries, routing results, and assembly placements.

The shared compiler layer should only provide:

- File manifest handling.
- Source maps.
- Diagnostics.
- Unit conversion helpers.
- Path-safe naming helpers.
- XML, JSON, CSV, and archive writing utilities when useful.

## Core Hooks Needed Later

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
</sol-robot>
```

This raises integration requirements:

- A board can be a physical object in a robot link.
- A connector can be both a circuit footprint and a robot/electromechanical
  interface.
- A motor can have CAD geometry, electrical pins, a URDF joint, and robot
  actuator metadata.
- A source map must allow one component to contribute to several external files.
- Units and coordinate frames must be explicit at every domain boundary.

## Implementation Order

Recommended implementation order:

1. Shared extension substrate: artifacts, source maps, deterministic naming,
   diagnostics, and unit conversion.
2. Robot definition export: robot IR, JSON export, URDF export, and mesh assets.
3. Circuit IR and board preview.
4. Circuit autorouting.
5. Circuit external export through `circuits/external` writers.
6. Cross-domain electromechanical workflows.

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

- Unit mismatches are likely across CAD, URDF, circuit formats, and simulation
  engines. Every exporter must state its unit conversions.
- Simulation projects may need engine-specific interpretation of joints,
  constraints, sensors, and actuators. Solidark should keep its robot JSON
  explicit and versioned so those loaders stay simple.
- Mesh handoff can lose B-Rep precision. CAD source should remain authoritative.
- Circuit design is its own domain. The built-in autorouter should be useful for
  simple boards, but it must be explicit about unsupported constraints and
  boards that require a stronger external router.
- Source maps can become fragile if names are implicit. Extensions should
  encourage explicit names for exported objects.
