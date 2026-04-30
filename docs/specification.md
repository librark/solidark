# Solidark Specification

Status: draft 0.1

Solidark is a JavaScript library for creating computer-aided design models using a
declarative, component-oriented API. It is designed as a syntactic and semantic
wrapper over OpenCascade.js, which brings the Open CASCADE Technology CAD kernel
to JavaScript and WebAssembly.

Solidark should make precise CAD modeling feel closer to OpenSCAD-style
Constructive Solid Geometry (CSG): users should be able to define models by
combining primitive building blocks, transformations, and boolean operations in a
tree. The library should still expose higher-level Boundary Representation
(B-Rep) features where they are necessary for practical CAD work, such as
fillets, chamfers, shells, sweeps, lofts, and STEP exchange.

## Goals

- Provide a simple, declarative CAD authoring API for JavaScript.
- Favor CSG-style modeling as the default mental model.
- Use OpenCascade.js as the underlying mature CAD kernel.
- Represent every model as a tree of compatible Solidark components.
- Support reusable parametric components in the style of React components or Web
  Components.
- Preserve access to B-Rep operations without forcing users to work directly
  with OpenCascade APIs for common modeling tasks.
- Run in browsers, workers, and server-side JavaScript runtimes where
  OpenCascade.js can be loaded.
- Produce precise CAD geometry suitable for engineering workflows and common
  export formats.

## Non-Goals

- Solidark is not a standalone graphical CAD application.
- Solidark is not a replacement CAD kernel.
- Solidark is not mesh-first. Meshes are display and export artifacts, not the
  source of truth for solid modeling.
- Solidark should not expose raw OpenCascade.js naming and object lifecycles as
  the primary user experience.

## Design Principles

### CSG First, B-Rep Powered

The public API should start with primitives, transforms, and boolean operations.
Internally, evaluated geometry should be represented by OpenCascade B-Rep shapes.
This keeps the user-facing API small while preserving the accuracy and breadth of
the underlying kernel.

### Declarative Trees

A model is a tree of nodes. Nodes may represent:

- Primitive geometry.
- Transformations.
- Boolean operations.
- B-Rep features.
- Groups and assemblies.
- User-defined components.

Evaluation should be bottom-up: child nodes produce shapes, parent nodes
transform or combine those shapes, and the root produces a complete model.

### Component Compatibility

All public building blocks should inherit from or be created through Solidark's
own base component system. This mirrors the compatibility role that a shared
`Component` base class plays in Componark, but for geometry instead of DOM
elements.

The component hierarchy should guarantee that primitives, operations,
transformations, features, and user components can be nested predictably.

### Parametric by Default

Every model should be reproducible from source code and parameters. Component
props should be plain serializable values where possible, so a model can be
inspected, cached, tested, regenerated, and shared.

### Kernel Isolation

OpenCascade.js should be accessed through a Solidark kernel adapter. User code
should be able to opt into low-level access, but normal modeling code should not
need to manage OpenCascade object allocation, deletion, or module-specific class
names.

### Explicit Units and Tolerances

Solidark should define a default coordinate system, unit convention, and
tolerance policy. Precision-sensitive behavior should be explicit instead of
hidden in individual operations.

## Coordinate and Numeric Conventions

- Default unit: millimeter.
- Coordinate system: right-handed.
- Up axis: `z`.
- Angles in the public CSG-style API: degrees, matching OpenSCAD expectations.
- Internal angle conversion to radians may be performed by the kernel adapter.
- Vectors may be provided as tuples, objects, or helper-created vector values:
  - Tuple: `[x, y, z]`
  - Object: `{ x, y, z }`
- Default modeling tolerance should be documented as `1e-7` model units unless
  OpenCascade operation constraints require a different value.

## Terminology

- `Node`: any value accepted by the Solidark tree.
- `Component`: a reusable object or function that returns nodes.
- `Primitive`: a leaf node that creates initial geometry.
- `Transform`: a node that changes child placement, scale, orientation, or
  coordinate frame.
- `Operation`: a node that combines children, usually through boolean CSG.
- `Feature`: a B-Rep operation that modifies or derives geometry from existing
  geometry.
- `Shape`: an evaluated OpenCascade-backed B-Rep result.
- `Sketch`: a 2D profile or wire used to create solids.
- `Assembly`: a structured collection of parts with placements and metadata.
- `Evaluation`: the process that compiles a Solidark tree into kernel geometry.
- `Triangulation`: a mesh generated from a shape for viewing or mesh export.

## Public API Shape

Solidark should provide two equivalent ways to author models:

1. Function components and factory helpers.
2. Class components inheriting from Solidark's base `Component`.

JSX may be supported as an optional syntax layer, but the core API should work
without a JSX transform.

### Factory Example

```js
import {
  box,
  cylinder,
  difference,
  translate,
  model,
} from "solidark";

export const mountingPlate = ({ width = 80, depth = 40, height = 8 }) =>
  model(
    difference(
      box({ size: [width, depth, height], center: true }),
      translate(
        [0, 0, -height],
        cylinder({ radius: 4, height: height * 3, center: true })
      )
    )
  );
```

### Component Example

```js
import { Component, box, cylinder, difference, translate } from "solidark";

export class MountingPlate extends Component {
  render() {
    const { width = 80, depth = 40, height = 8, holeRadius = 4 } = this.props;

    return difference(
      box({ size: [width, depth, height], center: true }),
      translate(
        [0, 0, -height],
        cylinder({ radius: holeRadius, height: height * 3, center: true })
      )
    );
  }
}
```

### Optional JSX Example

```jsx
import { Difference, Box, Cylinder, Translate } from "solidark/jsx";

export const MountingPlate = ({ width = 80, depth = 40, height = 8 }) => (
  <Difference>
    <Box size={[width, depth, height]} center />
    <Translate by={[0, 0, -height]}>
      <Cylinder radius={4} height={height * 3} center />
    </Translate>
  </Difference>
);
```

## Component Model

The core component system should be small and stable.

```ts
export abstract class Component<Props = unknown> {
  readonly props: Readonly<Props>;
  readonly children: readonly Node[];

  constructor(props?: Props, children?: readonly Node[]);

  abstract render(context: RenderContext): NodeLike;

  validate?(context: ValidationContext): void;
}
```

Required behavior:

- A component must be able to return primitives, operations, transforms,
  features, arrays of nodes, or another component.
- Components should be pure with respect to their props and render context.
- Components should not mutate evaluated kernel shapes directly.
- A component may validate props before geometry evaluation.
- Component identity, props, and children should support deterministic caching.
- User components must be indistinguishable from built-in components after tree
  normalization.

### Component Hierarchy

The component hierarchy should be explicit enough to guarantee compatibility but
small enough to avoid forcing users into inheritance-heavy modeling code.

Proposed hierarchy:

```text
Component
  ModelComponent
  GeometryComponent
    PrimitiveComponent
    OperationComponent
    FeatureComponent
    ExternalShapeComponent
  TransformComponent
  GroupComponent
  AssemblyComponent
```

The hierarchy may be implemented through classes, symbols, or internal node
descriptors, but every public building block must advertise the same core
contract:

- Accepted child kinds.
- Produced geometry kind.
- Serializable props.
- Evaluation behavior.
- Diagnostics metadata.

## Node Tree Semantics

Solidark should normalize every user model into an internal tree before calling
OpenCascade.js.

Normalization should:

- Resolve function components and class components.
- Flatten arrays of children where the receiving node accepts multiple children.
- Reject invalid child types with precise errors.
- Apply default props.
- Preserve stable names, ids, tags, and metadata.
- Produce an inspectable intermediate representation for debugging and tests.

The top-level `model()` node may contain one or more bodies. Multiple top-level
bodies should remain separate unless explicitly wrapped in `union()`.

## Geometry Kinds

Solidark should distinguish geometry kinds at the API and validation level.

- `Shape3D`: solid, shell, face, wire, compound, or other OpenCascade topological
  shape with 3D placement.
- `Solid`: a closed volume suitable for boolean operations and manufacturing
  export.
- `Surface`: a face or shell that may not enclose volume.
- `Sketch2D`: a 2D region, wire, or set of curves in a workplane.
- `Mesh`: triangulated display or mesh-export geometry.

Operations should state which kinds they accept and produce.

## Core Primitive Components

Initial 3D primitives:

- `box({ size, center })`
- `cube({ size, center })`, as a convenience alias for equal box dimensions.
- `sphere({ radius })`
- `cylinder({ radius, height, center })`
- `cone({ radius1, radius2, height, center })`
- `torus({ majorRadius, minorRadius })`

Initial 2D primitives:

- `circle({ radius })`
- `rectangle({ size, center })`
- `polygon({ points })`
- `polyline({ points, closed })`

Primitives should validate that dimensions are positive and finite.

## Transform Components

Core transforms:

- `translate(by, child)`
- `rotate(by, child)`
- `scale(by, child)`
- `mirror(normal, child)`
- `matrix(values, child)`
- `place(placement, child)`
- `workplane(options, child)`

Transform nodes should not evaluate geometry on their own. They should compose
placements and apply them to evaluated child shapes through the kernel adapter.

## CSG Operation Components

Core operations:

- `union(...children)`
- `difference(base, ...tools)`
- `intersection(...children)`
- `group(...children)`

Required semantics:

- `union()` combines multiple shapes into one shape.
- `difference()` subtracts all tool shapes from the base shape in argument order.
- `intersection()` returns the common volume of all children.
- `group()` preserves multiple children without performing a boolean operation.

Boolean operations should expose optional operation settings:

```ts
type BooleanOptions = {
  tolerance?: number;
  glue?: boolean;
  fuzzy?: number;
  check?: boolean;
  heal?: boolean;
};
```

## B-Rep Feature Components

B-Rep features should feel like normal tree nodes. They should accept CSG-built
geometry as input and return Solidark shapes.

Initial B-Rep features:

- `fillet({ radius, edges }, child)`
- `chamfer({ distance, edges }, child)`
- `shell({ thickness, faces }, child)`
- `offset({ distance, mode }, child)`
- `extrude({ height, direction }, sketch)`
- `revolve({ angle, axis }, sketch)`
- `sweep({ profile, path })`
- `loft({ profiles, ruled })`
- `section({ plane }, child)`
- `makeFace(wireOrSketch)`

Feature selection should support ergonomic selectors before exposing raw
OpenCascade topology:

- Select by named feature id.
- Select by tag.
- Select by geometric predicate.
- Select by explicit low-level topology handle as an advanced escape hatch.

## Sketching and Workplanes

Solidark should include a minimal but expandable sketch system because many
B-Rep operations begin from profiles.

Sketches should:

- Exist in a workplane.
- Support lines, arcs, circles, rectangles, and polygons.
- Support constraints later, but not require constraints for the initial release.
- Convert to wires or faces through the kernel adapter.
- Be usable by `extrude`, `revolve`, `sweep`, and `loft`.

Potential sketch API:

```js
const profile = sketch()
  .moveTo([0, 0])
  .lineTo([40, 0])
  .lineTo([40, 20])
  .lineTo([0, 20])
  .close();

const solid = extrude({ height: 10 }, profile);
```

## Assemblies and Metadata

Solidark should support both single-part models and assemblies.

Assembly nodes should preserve:

- Part names.
- Instance placement.
- Color and appearance.
- Material metadata.
- User-defined metadata.
- Export-specific metadata where supported.

Appearance should not change geometric identity unless explicitly configured to
participate in caching keys.

## Kernel Adapter

OpenCascade.js integration should live behind a kernel adapter.

```ts
export type Kernel = {
  makeBox(options: BoxOptions): KernelShape;
  makeSphere(options: SphereOptions): KernelShape;
  transform(shape: KernelShape, placement: Placement): KernelShape;
  booleanUnion(shapes: KernelShape[], options?: BooleanOptions): KernelShape;
  booleanDifference(
    base: KernelShape,
    tools: KernelShape[],
    options?: BooleanOptions
  ): KernelShape;
  triangulate(shape: KernelShape, options?: MeshOptions): Mesh;
  exportStep(shape: KernelShape, options?: StepExportOptions): Uint8Array;
  dispose(shape: KernelShape): void;
};
```

The real adapter may be broader, but it should isolate:

- OpenCascade module loading.
- WebAssembly lifecycle.
- Object disposal.
- Operation-specific OpenCascade classes.
- Conversion between Solidark data structures and kernel data structures.
- Kernel errors and diagnostics.

## Asynchronous Runtime

OpenCascade.js loads WebAssembly, so Solidark evaluation should be async.

Recommended shape:

```js
import { createKernel, evaluate } from "solidark";

const kernel = await createKernel();
const result = await evaluate(mountingPlate({ width: 100 }), { kernel });
```

The library may expose convenience APIs that manage a default kernel, but kernel
creation should remain explicit for applications that care about bundle size,
workers, caching, or custom OpenCascade.js builds.

## Evaluation Pipeline

Evaluation should proceed through these phases:

1. Normalize the user tree.
2. Validate component props and child geometry kinds.
3. Resolve parameters and inherited context.
4. Compile primitives and sketches to kernel shapes.
5. Apply transforms and placements.
6. Apply CSG operations and B-Rep features.
7. Heal or validate the resulting topology if requested.
8. Return a Solidark `EvaluationResult`.

```ts
export type EvaluationResult = {
  model: NormalizedModel;
  shapes: Shape[];
  diagnostics: Diagnostic[];
  bounds?: BoundingBox;
  dispose(): void;
};
```

Evaluation should be deterministic for identical input trees, kernel versions,
and tolerance settings.

## Caching

Solidark should support operation-level caching because CAD evaluation can be
expensive.

Cache keys should be based on:

- Component type.
- Serializable props.
- Normalized children.
- Kernel version.
- Tolerance settings.
- Geometry-affecting context.

Mutable kernel objects should never be used as public cache keys.

## Rendering and Mesh Generation

Solidark should generate triangulated meshes from B-Rep shapes for rendering.
Rendering support should not be coupled to a specific viewer, but the library
should make Three.js interop straightforward.

Mesh options:

```ts
type MeshOptions = {
  linearDeflection?: number;
  angularDeflection?: number;
  relative?: boolean;
  includeNormals?: boolean;
  includeEdges?: boolean;
};
```

The mesh API should preserve a mapping from rendered triangles or groups back to
source components where practical, enabling selection and inspection in a CAD UI.

## Import and Export

Initial export targets:

- STEP for precise CAD exchange.
- STL for mesh-based manufacturing workflows.
- OBJ or GLB for web visualization workflows.
- BREP for kernel-native debugging and interchange.

Initial import targets:

- STEP as an external shape component.
- BREP as a kernel-native external shape component.

Imported shapes should participate in transforms, booleans, features, and
assemblies like any other Solidark shape.

## Diagnostics and Errors

Errors should be typed and actionable.

Required error categories:

- Invalid props.
- Invalid child geometry kind.
- Kernel load failure.
- Kernel operation failure.
- Boolean operation failure.
- Topology validation failure.
- Export failure.

Diagnostics should include:

- Component path in the normalized tree.
- Operation name.
- Source component name or id when available.
- Kernel message when available.
- Suggested user action when the issue is predictable.

## Package Structure

Potential package layout:

- `solidark`: core public API.
- `solidark/jsx`: optional JSX runtime and component names.
- `solidark/kernel/opencascade`: OpenCascade.js adapter.
- `solidark/three`: optional Three.js conversion helpers.
- `solidark/testing`: geometry assertions and test helpers.

The core package should avoid importing viewer integrations by default.

## TypeScript Support

Solidark should be JavaScript-first but TypeScript-friendly.

Requirements:

- Public APIs should ship TypeScript declarations.
- Props should be strongly typed.
- Geometry kind constraints should be represented in types where practical.
- Runtime validation must still exist because plain JavaScript users are a first
  class audience.

## Testing and Conformance

The specification should be backed by tests once implementation begins.

Recommended test categories:

- Primitive dimensions and bounding boxes.
- Transform composition.
- Boolean operation behavior.
- B-Rep feature behavior.
- Serialization of normalized trees.
- Export smoke tests.
- Kernel object disposal tests.
- Cross-runtime tests for browser, worker, and Node-compatible environments.

Geometry tests should avoid relying only on mesh snapshots. Prefer analytic
checks, bounding boxes, volumes, topology counts, or STEP round trips where
possible.

## Initial MVP Scope

The first useful release should include:

- Base `Component` class.
- Tree normalization and validation.
- OpenCascade.js kernel adapter.
- Core 3D primitives: box, sphere, cylinder, cone.
- Core transforms: translate, rotate, scale, mirror.
- Core booleans: union, difference, intersection.
- Minimal sketch profiles.
- Extrude and revolve.
- Fillet and chamfer.
- Triangulation for display.
- STEP and STL export.
- Clear diagnostics.
- TypeScript declarations.

Features that can wait:

- Constraint-based sketches.
- Full assembly metadata export.
- Advanced selectors.
- Loft and sweep if they complicate the first kernel adapter.
- Browser viewer components.
- Custom OpenCascade.js build tooling.

## Open Questions

- Should JSX be a first-class supported authoring style or an optional adapter?
- Should the top-level `model()` ever implicitly union children, or should
  explicit `union()` always be required?
- Should public angles follow OpenSCAD degrees everywhere, or should B-Rep
  feature APIs accept radians for closer kernel alignment?
- How much of the component base class should mirror Componark conventions?
- Should Solidark expose Web Components for interactive viewers later, or remain
  a pure modeling library?
- What should the stable naming convention be: `box()` or `Box`, `difference()`
  or `Difference`, or both through separate entry points?
- Should imported STEP assemblies preserve hierarchy in the first release?

## References

- OpenCascade.js: https://ocjs.org/
- OpenCascade.js project page: https://dev.opencascade.org/project/opencascadejs
- Componark package documentation: https://libraries.io/npm/%40knowark%2Fcomponarkjs
