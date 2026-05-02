# Solidark Circuit Extension Specification

Status: draft 0.1

Package: `@solidark/circuit`

The circuit extension should let Solidark describe electronic assemblies using
the same declarative component style as mechanical CAD. It should learn from
tscircuit's React-based component model while staying aligned with Solidark's
plain JavaScript and Web Components constraints.

The package should be named around circuits rather than only PCBs because the
source model should eventually cover the logical circuit, board layout,
assembly, fabrication data, and mechanical representation.

## Goals

- Define circuits, boards, nets, parts, footprints, pads, vias, traces, zones,
  keepouts, and manufacturing metadata.
- Compile circuit DOM trees into deterministic circuit IR.
- Provide automatic trace routing as a first-class package responsibility.
- Generate board preview data and 3D Solidark board previews.
- Generate fabrication files such as Gerber, drill, BOM, and pick-and-place.
- Generate KiCad project files for review and editing.
- Integrate with Solidark mechanical assemblies.

## Non-Goals

- The circuit extension should not replace KiCad or fabrication review tools.
- The circuit extension should not require React, JSX, or TypeScript-only APIs.
- The circuit extension should not make Solidark core electronics-first.
- The first autorouter should not try to solve every PCB-routing problem.

## Initial Components

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

## Circuit IR

The circuit compiler should produce a deterministic, serializable IR with:

- Board outline and stackup.
- Layer definitions.
- Netlist.
- Component instances.
- Footprint instances.
- Pads, vias, holes, traces, fills, zones, and keepouts.
- Schematic symbols and net labels when schematic export is enabled.
- BOM entries.
- Pick-and-place placements.
- Routing constraints and routing results.
- 3D component placements and board solid preview.
- Source map entries.

The IR should be deterministic and serializable so tests can assert it without
requiring a PCB editor.

## CAD Integration

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

## Routing Strategy

Automatic trace routing should be a first-class responsibility of the circuit
package. Users should be able to define parts, pads, nets, constraints, and
keepouts declaratively, then ask Solidark to produce routed traces and vias as
part of circuit compilation.

Routing should still be staged so the package can become useful without trying
to solve every PCB-routing problem immediately:

- Phase 1: explicit manual traces plus ratsnest generation and route
  diagnostics.
- Phase 2: built-in deterministic autorouting for simple one-layer and two-layer
  boards.
- Phase 3: routing constraints such as preferred layers, trace widths,
  clearances, via rules, differential-pair metadata, keepouts, and routing
  priorities.
- Phase 4: external autorouter adapters when a board exceeds the built-in
  router's practical scope.
- Phase 5: interactive or incremental routing support if the browser workflow
  later needs it.

The built-in router should favor deterministic, testable behavior over
black-box optimization. It should be acceptable for the first router to refuse a
complex board with clear diagnostics, but simple boards should route without
leaving Solidark.

## Export Targets

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
KiCad, Gerber, drill, BOM, and placement writers should remain implementation
modules under a `circuits/external` directory rather than becoming separate
public namespaces.

Later exports:

- IPC-2581 or IPC-DPMX for richer manufacturing exchange.
- Circuit JSON compatibility if it makes interoperability with tscircuit useful.
- SPICE netlists for circuit simulation.
- STEP export of assembled boards for mechanical CAD handoff.

## Validation

The circuit compiler should report:

- Duplicate reference designators.
- Missing footprints.
- Unknown nets or pin references.
- Unconnected required pins.
- Nets that could not be routed automatically.
- Trace width or clearance violations.
- Via diameter and annular ring violations.
- Copper too close to board edge or cutouts.
- Silkscreen over exposed pads.
- Courtyard collisions.
- Missing BOM fields for assembly export.
- Component height violations against declared keepout volumes.
- Board outline self-intersections or unsupported curves for a given exporter.
- Routing constraints that conflict with each other or with fabrication rules.

## Implementation Phases

### Phase 1: Circuit Components and IR

- Implement circuit component classes.
- Compile circuit DOM trees into deterministic circuit IR.
- Generate source maps and diagnostics.

Exit criteria:

- A simple two-layer board with parts, nets, and manual traces can be compiled.
- The board has deterministic circuit IR.

### Phase 2: Board Preview and DRC

- Generate ratsnest data and explicit manual routes.
- Render 2D board data into a preview-friendly structure.
- Generate a 3D board preview using Solidark geometry.
- Add DRC diagnostics for the first simple rules.

Exit criteria:

- The board has both a circuit IR and a 3D Solidark preview model.
- Unrouted nets are visible through ratsnest diagnostics.

### Phase 3: Autorouting

- Implement a deterministic built-in autorouter for simple boards.
- Generate routed traces and vias from nets, pads, board outline, layers, and
  keepouts.
- Support basic routing constraints for trace width, clearance, via size, and
  preferred layers.
- Report unroutable nets with stable diagnostics.

Exit criteria:

- A simple one-layer board can route automatically.
- A simple two-layer board can route automatically using vias.
- Re-running the same board produces the same routed output.

### Phase 4: External Export

- Generate Gerber layer files and drill files.
- Generate BOM and pick-and-place files.
- Generate KiCad board/project files from circuit IR.
- Keep format writers under a `circuits/external` implementation directory.
- Add board export examples to the showcase.

Exit criteria:

- A simple board can be reviewed in KiCad.
- A fabrication archive can be produced with Gerber, drill, BOM, and placement
  outputs.

### Phase 5: Mechanical Integration

- Allow circuit boards to mount into robot links or mechanical assemblies.
- Add connector, motor, sensor, and mounting-hole correspondence helpers.
- Add checks for board-to-enclosure and robot-to-board mechanical conflicts.

Exit criteria:

- One source tree can generate mechanical preview assets, circuit fabrication
  files, and robot definition files with shared source mapping.

## Open Questions

- Should the first circuit authoring model require explicit footprints, or
  should common parts have built-in footprint defaults?
- Should schematic capture be first-class in the first circuit release, or
  should layout/netlist come first?
- What routing algorithm should the first deterministic autorouter use?
- Which autorouting features are mandatory for the first useful two-layer board?
- Should the circuit extension interoperate with tscircuit by importing or
  exporting Circuit JSON?
- Should supplier metadata be generic or should adapters exist for JLCPCB,
  Digi-Key, Mouser, and other vendors?
- Should KiCad export come before direct Gerber generation to gain an immediate
  review workflow?

## References

- tscircuit demonstrates a component-based electronics workflow that can produce
  PCB, schematic, 3D preview, BOM, autorouting, and fabrication outputs:
  https://docs.tscircuit.com/
- Gerber is the primary PCB fabrication data transfer target:
  https://www.ucamco.com/en/gerber
- KiCad's documented S-expression board and schematic formats make it a strong
  review and editing target:
  https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/

