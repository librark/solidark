# Solidark Specification

Status: draft 0.2

Solidark is a JavaScript library for creating computer-aided design models using a
declarative Web Components API. It is designed as a syntactic and semantic
wrapper over OpenCascade.js, which brings the Open CASCADE Technology CAD kernel
to JavaScript and WebAssembly.

Solidark should make precise CAD modeling feel closer to OpenSCAD-style
Constructive Solid Geometry (CSG): users should be able to define models by
combining primitive building blocks, transformations, and boolean operations in a
DOM-backed tree. Each Solidark component is also a custom element that can be
placed in the document. The library should still expose higher-level Boundary
Representation (B-Rep) features where they are necessary for practical CAD work,
such as fillets, chamfers, shells, sweeps, lofts, and STEP exchange.

## Goals

- Provide a simple, declarative CAD authoring API for plain JavaScript.
- Favor CSG-style modeling as the default mental model.
- Use OpenCascade.js as the underlying mature CAD kernel.
- Represent every model as a DOM tree of compatible Solidark custom elements.
- Support reusable parametric components through classes that inherit from
  Solidark's base `Component`.
- Follow Componark's component structure closely where it helps modeling:
  `Component` should extend `HTMLElement`, expose a `content` property, and use
  native custom element lifecycle hooks.
- Preserve access to B-Rep operations without forcing users to work directly
  with OpenCascade APIs for common modeling tasks.
- Make CAD models natural to test with ordinary web-development tools and
  test-driven development workflows.
- Run in browsers and in DOM-capable worker or server-side JavaScript runtimes
  where custom elements and OpenCascade.js can be loaded.
- Provide a direct browser visualization path so developers can inspect model
  changes while iterating.
- Produce precise CAD geometry suitable for engineering workflows and common
  export formats.

## Non-Goals

- Solidark is not a standalone graphical CAD application.
- Solidark is not a replacement CAD kernel.
- Solidark is not mesh-first. Meshes are display and export artifacts, not the
  source of truth for solid modeling.
- Solidark should not expose raw OpenCascade.js naming and object lifecycles as
  the primary user experience.
- Solidark should not provide JSX, React-style function components, or a
  factory-helper authoring API.

## Design Principles

### CSG First, B-Rep Powered

The public API should start with primitives, transforms, and boolean operations.
Internally, evaluated geometry should be represented by OpenCascade B-Rep shapes.
This keeps the user-facing API small while preserving the accuracy and breadth of
the underlying kernel.

### Declarative Trees

A model is a DOM tree of Solidark custom elements. Elements may represent:

- Primitive geometry.
- Transformations.
- Boolean operations.
- B-Rep features.
- Groups and assemblies.
- User-defined components.

Evaluation should be bottom-up: child elements produce shapes, parent elements
transform or combine those shapes, and the root produces a complete model.

### Component Compatibility

All public building blocks must inherit from Solidark's own `Component` base
class, which extends `HTMLElement`. This mirrors the compatibility role that a
shared `Component` base class plays in Componark while specializing the behavior
for geometry instead of interface widgets.

The component hierarchy should guarantee that primitives, operations,
transformations, features, and user components can be nested predictably.

### DOM as the Source Tree

The DOM is the source tree for a Solidark model. User components define their
children by assigning an HTML string to `this.content` in `render()`. The
`content` setter should delegate to `HTMLElement.innerHTML`, then schedule a
Solidark update so newly created child elements can be upgraded, normalized, and
evaluated.

Solidark may maintain an internal normalized representation for evaluation and
caching, but it should be derived from the DOM tree rather than replacing it as
the public authoring model.

### Parametric by Default

Every model should be reproducible from source code, element attributes, DOM
properties, and parameters. Component properties should be plain serializable
values where possible, so a model can be inspected, cached, tested, regenerated,
and shared.

### Styling as Metadata

Visual styling should be represented as serializable metadata attached to the
model tree, not as geometric topology. A `color` attribute may be set on any
geometry-producing component for concise one-off styling. A dedicated
`<sol-color>` wrapper should also exist for applying the same styling to a
subtree.

The nearest inherited color should apply to descendants unless a child shape
sets its own `color`. Direct component color therefore has precedence over a
wrapping `<sol-color>`, and exported display formats such as GLB should convert
the resolved styling metadata into materials. Kernel adapters may later map
the same metadata into CAD document color systems such as STEP/XCAF, but color
must not change boolean or B-Rep construction behavior.

### Testable by Design

Testability is a core value proposition of Solidark. A model should feel natural
to test for web developers and engineers who prefer test-driven development.

Solidark should make it straightforward to:

- Instantiate components in tests.
- Set attributes or properties as test inputs.
- Await rendering, loading, and evaluation with explicit promises.
- Assert normalized model trees without loading the CAD kernel.
- Assert evaluated geometry through bounds, volume, topology, diagnostics, or
  exported artifacts.
- Run fast unit tests for parsing, validation, scheduling, and tree
  normalization.
- Keep slower kernel-backed geometry tests focused and explicit.

### Kernel Isolation

OpenCascade.js should be accessed through a Solidark kernel adapter loaded by
the component runtime. User code should be able to opt into low-level access, but
normal modeling code should not need to manage OpenCascade object allocation,
deletion, or module-specific class names.

### Explicit Units and Tolerances

Solidark should define a default coordinate system, unit convention, and
tolerance policy. Precision-sensitive behavior should be explicit instead of
hidden in individual operations.

## Coordinate and Numeric Conventions

- Default unit: millimeter.
- Coordinate system: right-handed.
- Up axis: `z`.
- Built-in finite primitives and generated finite solids should be centered on
  their local origin by default.
- Components that need non-centered local placement should use an explicit
  placement, transform, or `anchor` property rather than a `center` boolean.
- Angles in every public API should be expressed in degrees, matching OpenSCAD
  expectations.
- Internal angle conversion to radians should be performed by the kernel adapter
  whenever OpenCascade.js expects radians.
- Vectors in HTML attributes should use space-separated numeric strings, such as
  `"10 0 0"`.
- Vectors assigned through JavaScript properties may be provided as tuples,
  objects, or helper-created vector values:
  - Tuple: `[x, y, z]`
  - Object: `{ x, y, z }`
- Default modeling tolerance should be documented as `1e-7` model units unless
  OpenCascade operation constraints require a different value.

## Terminology

- `Node`: a Solidark custom element in the model tree, or its normalized
  internal descriptor.
- `Component`: the base class for all Solidark elements; it extends
  `HTMLElement`.
- `Primitive`: a leaf element that creates initial geometry.
- `Transform`: an element that changes child placement, scale, orientation, or
  coordinate frame.
- `Operation`: an element that combines children, usually through boolean CSG.
- `Feature`: a B-Rep operation that modifies or derives geometry from existing
  geometry.
- `Shape`: an evaluated OpenCascade-backed B-Rep result.
- `Sketch`: a 2D profile or wire used to create solids.
- `Assembly`: a structured collection of parts with placements and metadata.
- `Evaluation`: the process that compiles a Solidark tree into kernel geometry.
- `Triangulation`: a mesh generated from a shape for viewing or mesh export.

## Public API Shape

Solidark should provide one authoring model: class components that inherit from
Solidark's base `Component`, which itself inherits from `HTMLElement`.

The public API should be plain JavaScript. Type information may be provided
through JSDoc comments in the JavaScript source and through generated or
hand-authored TypeScript declaration files, but the library implementation
should not require TypeScript and should not require JSX.

Built-in modeling concepts should be represented by custom elements:

- `<sol-model>`
- `<sol-cuboid>`
- `<sol-cylinder>`
- `<sol-translate>`
- `<sol-difference>`
- `<sol-fillet>`
- `<sol-sketch>`
- `<sol-color>`

Built-in Solidark modeling elements should use the `sol-` custom element prefix
consistently.

### HTML Example

```html
<sol-model id="mounting-plate">
  <sol-difference>
    <sol-cuboid size="80 40 8" color="#ccd6e0"></sol-cuboid>
    <sol-cylinder radius="4" height="24"></sol-cylinder>
  </sol-difference>
</sol-model>
```

### Component Example

```js
import { Component, html } from "solidark";

export class MountingPlate extends Component {
  static tag = "mounting-plate";

  static defaultProperties = {
    width: 80,
    depth: 40,
    height: 8,
    holeRadius: 4,
  };

  render() {
    const { width, depth, height, holeRadius } = this.properties;

    this.content = html`
      <sol-difference>
        <sol-cuboid size="${width} ${depth} ${height}"></sol-cuboid>
        <sol-cylinder
          radius="${holeRadius}"
          height="${height * 3}"
        ></sol-cylinder>
      </sol-difference>
    `;
  }
}

MountingPlate.define();
```

The component can then be used like any other custom element:

```html
<sol-model>
  <mounting-plate width="100" depth="50" height="10"></mounting-plate>
</sol-model>
```

## Component Model

The core component system should be small, stable, and close to Componark's
custom element model.

```js
export class Component extends HTMLElement {
  static tag = "";
  static defaultProperties = {};
  static observedAttributes = [];

  static define(tag = this.tag) {
    customElements.define(tag, this);
  }

  connectedCallback() {
    this.scheduleRender();
  }

  attributeChangedCallback() {
    this.scheduleRender();
  }

  get properties() {
    return this.readProperties();
  }

  get content() {
    return this.innerHTML;
  }

  set content(value) {
    this.innerHTML = value;
    this.scheduleUpdate();
  }

  init(properties = {}) {
    Object.assign(this, properties);
    return this;
  }

  render() {
    return this;
  }

  load() {
    return SolidarkRuntime.load();
  }

  evaluate() {
    return SolidarkRuntime.evaluate(this);
  }
}
```

Required behavior:

- A component must be a valid custom element and must inherit from
  `Component`.
- `Component` must inherit from `HTMLElement`.
- Components define child geometry by setting `this.content` inside `render()`.
- The `content` setter must set `HTMLElement.innerHTML` and schedule a Solidark
  update.
- Properties should be read from attributes, DOM properties, and
  `defaultProperties`.
- Components should avoid mutating evaluated kernel shapes directly.
- A component may validate properties before geometry evaluation.
- Component identity, properties, attributes, and child DOM should support
  deterministic caching.
- User components must be indistinguishable from built-in components after DOM
  normalization.
- Components should expose `init()`, `render()`, and `load()` as core lifecycle
  and helper methods.
- Components may expose `evaluate()` as a convenience method that delegates to
  the shared runtime.

Initialization behavior:

- `init()` should configure a component programmatically before or after it is
  attached to the DOM.
- `init()` should accept plain property values, assign them through the
  component's public property surface, and return `this` for chaining.
- `init()` should schedule render or evaluation when the configured properties
  affect geometry.
- `init()` should remain synchronous; asynchronous preparation belongs in
  `load()` or explicit promises.

Rendering behavior:

- `render()` should return `this` to allow chaining, following the same style as
  `init()`.
- `render()` should define child structure by assigning `this.content`.
- Returning an HTML string from `render()` should not be a supported alternate
  content path.
- `render()` may be skipped by primitive leaf components whose geometry is fully
  described by attributes.
- `render()` must not synchronously call expensive OpenCascade operations.
- Re-rendering must preserve custom element upgrade semantics and schedule
  geometry evaluation after the DOM subtree is stable.
- The `content` property is intended for library-authored or trusted model
  markup. Applications that pass untrusted strings into components must sanitize
  them before assignment.

Lifecycle behavior:

- `connectedCallback()` should remain synchronous and schedule the first render
  and evaluation.
- `load()` should be the standard place for asynchronous component preparation,
  including kernel loading or loading external model data.
- `attributeChangedCallback()` should schedule re-rendering when geometry-affecting
  attributes change.
- `disconnectedCallback()` should release or dereference evaluated kernel shapes
  owned by the component.

### Component Hierarchy

The component hierarchy should be explicit enough to guarantee compatibility but
small enough to avoid forcing users into inheritance-heavy modeling code.

Proposed hierarchy:

```text
Component
  StructureComponent
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

The hierarchy should be implemented as JavaScript classes. Internal descriptors
may be used for evaluation, but every public building block must be a custom
element class and must advertise the same core contract:

- Accepted child kinds.
- Produced geometry kind.
- Serializable properties.
- Evaluation behavior.
- Diagnostics metadata.
- Custom element tag name.

### Element Registration

Solidark should register built-in components through native
`customElements.define()`.

Registration requirements:

- Each class should expose a stable static `tag` name.
- `Component.define()` should register a class under its static tag by default.
- Each built-in component module should call `define()` in its own source file,
  so importing `solidark/primitives/cuboid`, `solidark/feature/step`, or any
  aggregate index that re-exports them makes the corresponding browser element
  available immediately.
- The package may keep `defineSolidarkElements()` as a compatibility helper that
  returns the built-in component list, but it should not be the primary
  registration mechanism.
- Registration should be idempotent: calling `define()` for an already-defined
  compatible tag should not throw.
- User components should use the same registration path as built-in components.

## Node Tree Semantics

Solidark should normalize every user model from the DOM into an internal tree
before calling OpenCascade.js.

Normalization should:

- Ensure custom elements have been upgraded.
- Run scheduled `render()` calls so `content` has produced the intended child
  DOM.
- Traverse Solidark custom element children in DOM order.
- Reject unsupported child elements with precise errors.
- Apply default properties.
- Parse attributes into typed property values.
- Preserve stable names, ids, tags, and metadata.
- Produce an inspectable intermediate representation for debugging and tests.

The top-level `<sol-model>` element may contain one or more bodies. When it has
multiple geometry-producing children, it should implicitly evaluate them as a
union. Explicit `<sol-union>` may still be used inside a model for clarity or for
localized boolean structure.

## Styling Components

Styling components apply rendering and export metadata to their child
subtree. They should not create, delete, transform, or combine OpenCascade
topology.

Styling components must be transparent in the evaluated geometry tree: placing
`<sol-color>` around a primitive, transform, operation, feature, sketch profile,
or imported body should preserve the wrapped component's normal geometric role
while applying styling metadata to the resulting shape descriptors.

Initial styling component:

- `<sol-color value="...">`

Required color semantics:

- Any geometry-producing element may set `color="..."` directly.
- `<sol-color value="...">` and `<sol-color color="...">` apply color to all
  descendant shapes that do not set their own direct `color`.
- Direct `color` on a child takes precedence over inherited color from the
  nearest `<sol-color>` ancestor.
- Colors should be accepted as hexadecimal strings such as `#336699`, named
  CSS colors where supported by the library, numeric arrays, or RGB/RGBA strings.
- Color should be carried on evaluated shape descriptors as styling metadata.
- Mesh and GLB exporters should convert resolved color metadata into material
  color.
- Boolean, transform, and B-Rep operations should pass styling metadata along
  without treating it as geometric input.

## Attributes and Properties

Solidark components should be usable from both HTML markup and plain JavaScript.

Attribute conventions:

- Numbers should be parsed from decimal strings.
- Booleans should follow normal HTML boolean attribute behavior.
- Vectors should be parsed from space-separated or comma-separated strings.
- Lists of points may use space-separated or comma-separated vector strings.
- Complex selector data may be provided through JSON attributes only when a
  simpler attribute grammar would be ambiguous.

Property conventions:

- Every geometry-affecting attribute should have an equivalent JavaScript
  property.
- Properties may accept richer values than attributes, such as arrays, objects,
  selector functions, or preloaded external shape handles.
- Setting a geometry-affecting property should schedule render or evaluation in
  the same way as changing an attribute.
- Parsed properties should be available through `this.properties` and should
  include `defaultProperties`.

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

- `<sol-cuboid size="x y z">` - providing a single scalar creates a cube
- `<sol-sphere radius="r">`
- `<sol-cylinder radius="r" height="h">`
- `<sol-cone radius1="r1" radius2="r2" height="h">`
- `<sol-torus major-radius="r1" minor-radius="r2">`

Initial 2D primitives:

- `<sol-circle radius="r">`
- `<sol-rectangle size="x y">` providing a single scalar creates a square
- `<sol-polygon points="x1 y1, x2 y2, ...">`
- `<sol-polyline points="x1 y1, x2 y2, ..." closed>`

Primitives should validate that dimensions are positive and finite. Finite
primitives should be centered on their local origin unless an explicit `anchor`
or transform specifies otherwise.

## Transform Components

Core transforms:

- `<sol-translate by="x y z">`
- `<sol-rotate by="x y z">`
- `<sol-scale by="x y z">`
- `<sol-mirror normal="x y z">`
- `<sol-matrix values="...">`
- `<sol-place origin="x y z" direction="x y z" x-direction="x y z">`
- `<sol-workplane origin="x y z" normal="x y z">`

Transform elements should not evaluate geometry on their own. They should
compose placements and apply them to evaluated child shapes through the kernel
adapter.

## CSG Operation Components

Core operations:

- `<sol-union>`
- `<sol-difference>`
- `<sol-intersection>`
- `<sol-group>`

Required semantics:

- `<sol-union>` combines multiple shapes into one shape.
- `<sol-difference>` treats its first child as the base and subtracts all
  subsequent tool shapes in DOM order.
- `<sol-intersection>` returns the common volume of all children.
- `<sol-group>` preserves multiple children without performing a boolean
  operation.

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

B-Rep features should feel like normal custom elements. They should accept
CSG-built geometry as child input and return Solidark shapes.

Initial B-Rep features:

- `<sol-fillet radius="r" edges="...">`
- `<sol-chamfer distance="d" edges="...">`
- `<sol-shell thickness="t" faces="...">`
- `<sol-offset distance="d" mode="...">`
- `<sol-extrude height="h" direction="x y z">`
- `<sol-revolve angle="a" axis="x y z">`
- `<sol-sweep>`
- `<sol-loft ruled>`
- `<sol-section plane="...">`
- `<sol-face>`

The first implementation may use explicit topology indexes for feature
selection. Fillet and chamfer should read `edges`, `edge`, or `select`; shell
should read `faces`, `open-faces`, or `remove`. When an edge selector is
omitted, or set to `all`, every edge of the child shape should be used. Setting
an edge selector to `none` should leave the shape unchanged. When a shell face
selector is omitted, `false`, or `none`, the shell should remain closed; setting
it to `all` should remove every face. Indexed selectors should support single
indexes, negative indexes from the end, whitespace/comma/semicolon-separated
lists, ranges such as `0..3` or `3-1`, and stable aliases such as `first` and
`last`. Feature construction should be best-effort by default so examples
remain inspectable across OpenCascade.js builds; setting `strict` should surface
the underlying kernel error.

Feature selection should support ergonomic selectors before exposing raw
OpenCascade topology:

- Select by named topology selector. A source component may declare names with a
  `topology` attribute such as `topology="rounded:edge:0..3 lid:face:last"`,
  and feature components may later use those names as selectors, such as
  `<sol-fillet edges="rounded">` or `<sol-shell faces="lid">`. The first
  implementation may preserve these names only across single-child transforms
  and styling wrappers; boolean operations may rebuild topology and should not
  promise stable name preservation until explicit topological naming support is
  implemented in the kernel adapter.
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
- Be usable by `<sol-extrude>`, `<sol-revolve>`, `<sol-sweep>`, and
  `<sol-loft>`.

Potential sketch API:

```html
<sol-extrude height="10">
  <sol-sketch>
    <sol-move point="0 0"></sol-move>
    <sol-line point="40 0"></sol-line>
    <sol-line point="40 20"></sol-line>
    <sol-line point="0 20"></sol-line>
    <sol-close></sol-close>
  </sol-sketch>
</sol-extrude>
```

Equivalent user component:

```js
class ProfiledPlate extends Component {
  static tag = "profiled-plate";

  render() {
    this.content = `
      <sol-extrude height="10">
        <sol-sketch>
          <sol-move point="0 0"></sol-move>
          <sol-line point="40 0"></sol-line>
          <sol-line point="40 20"></sol-line>
          <sol-line point="0 20"></sol-line>
          <sol-close></sol-close>
        </sol-sketch>
      </sol-extrude>
    `;
  }
}
```

## Assemblies and Metadata

Solidark should support both single-part models and assemblies.

Assembly elements should preserve:

- Part names.
- Instance placement.
- Color and styling.
- Material metadata.
- User-defined metadata.
- Export-specific metadata where supported.

Styling should not change geometric identity unless explicitly configured to
participate in caching keys.

## Kernel Adapter

OpenCascade.js integration should live behind a kernel adapter. The abstract
kernel contract and `globalThis.kernel` accessors should live under
`solidark/base/kernel` so component classes can depend on a small stable
interface. Concrete runtime adapters should live under `solidark/runtime/kernel`
so the runtime can use different backends without changing component code:

- `solidark/base/kernel`: the abstract `Kernel` class, global kernel accessors,
  and the deterministic `MemoryKernel` implementation for unit tests,
  snapshots, and lightweight previews.
- `solidark/runtime/kernel/opencascade`: the default `OpencascadeKernel`
  implementation backed by OpenCascade.js.

Because Web Component constructors cannot receive arbitrary constructor
arguments from markup, the active kernel should be stored on `globalThis.kernel`.
The runtime should read that global kernel during `load()`. If no kernel has
been installed, `load()` should install the OpenCascade adapter by default.
Tests should replace `globalThis.kernel` with the in-memory adapter before
evaluation. The `solidark/kernel/*` package paths may remain compatibility
aliases for the current public kernel modules, but source ownership should
follow the `base/kernel` and `runtime/kernel` split. The `base/kernel`
directory must not reference Solidark custom element names, `sol-` tags, DOM
categories, or any other higher-level library modules. It is a core dependency
that other library layers may import, not a layer that may import or know about
those callers.

```ts
export abstract class Kernel {
  name: string;
  createShape(
    method: string,
    options?: Record<string, unknown>,
    children?: KernelShape[]
  ): KernelShape;
  abstract cuboid(options: CuboidOptions): KernelShape;
  abstract sphere(options: SphereOptions): KernelShape;
  abstract cylinder(options: CylinderOptions): KernelShape;
  abstract translate(options: TranslateOptions, children: KernelShape[]): KernelShape;
  abstract union(options: UnionOptions, children: KernelShape[]): KernelShape;
  abstract difference(options: DifferenceOptions, children: KernelShape[]): KernelShape;
  abstract fillet(options: FilletOptions, children: KernelShape[]): KernelShape;
  abstract sketch(options: SketchOptions, children: KernelShape[]): KernelShape;
  abstract step(options: StepImportOptions): KernelShape;
  abstract stl(options: StlImportOptions): KernelShape;
  toMesh?(shape: KernelShape, options?: MeshOptions): Mesh | Mesh[] | null;
  dispose(shape: KernelShape): void;
}

export class MemoryKernel extends Kernel {}
export class OpencascadeKernel extends MemoryKernel {}
```

The real adapter must cover every built-in component with explicit methods named
after Solidark operations (`cuboid`, `translate`, `union`, `fillet`, `sketch`,
`stl`, and so on). Each Solidark component subclass should define its geometry
by calling the active kernel directly from a component method dedicated to shape
construction, such as `build(properties, children, kernel)`. `render()`
should remain focused on synchronous DOM/markup composition; it should not run
kernel work because the production kernel may be loaded asynchronously and
OpenCascade operations may be expensive. The evaluator may still walk the tree
centrally, but it should delegate shape construction back to the component class
instead of keeping component behavior in a central tag switch. The component
layer may annotate kernel results with Solidark DOM metadata such as `tag` or
`category`; the base kernel layer should only deal in kernel operation names and
kernel-owned data. The adapter may still expose additional helper methods
internally, but it should isolate:

- OpenCascade module loading.
- WebAssembly lifecycle.
- Object disposal.
- Operation-specific OpenCascade classes.
- Conversion between Solidark data structures and kernel data structures.
- Kernel errors and diagnostics.

## Asynchronous Runtime

OpenCascade.js loads WebAssembly, so Solidark evaluation must be asynchronous.
The component runtime should provide an explicit promise-based loading mechanism
and should defer geometry evaluation until the DOM subtree is rendered and the
kernel is available.

Recommended shape:

```js
import { Component, SolidarkRuntime } from "solidark";

await SolidarkRuntime.load();

const model = document.querySelector("sol-model");
const result = await model.evaluate();
```

Component-level convenience:

```js
class AsyncPart extends Component {
  static tag = "async-part";

  connectedCallback() {
    super.connectedCallback();
    this.ready = this.load().then(() => this.evaluate());
  }
}
```

Runtime requirements:

- `SolidarkRuntime.load()` must return a promise that resolves to the loaded
  kernel adapter.
- `component.load()` should delegate to `SolidarkRuntime.load()`.
- Multiple simultaneous load calls must share the same in-flight promise.
- Browser custom element lifecycle callbacks, including `connectedCallback()`,
  are expected to run synchronously. Solidark components must start asynchronous
  work from lifecycle callbacks without making the callbacks themselves blocking
  or relying on the browser to await them.
- Components that initiate asynchronous work should expose an explicit promise,
  such as `ready`, `loaded`, or the return value of `evaluate()`, for tests and
  applications to await.
- Rendering and evaluation should be scheduled after attribute changes and
  `content` assignment.
- The scheduler should prefer microtasks by default, using promises or
  `queueMicrotask`.
- The scheduler should use a macro-task such as `setTimeout(..., 0)` only when
  custom element upgrade timing or DOM parsing requires it.
- Scheduling details should be hidden behind a runtime scheduler rather than
  scattered through component implementations.
- Applications that care about bundle size, workers, caching, or custom
  OpenCascade.js builds should be able to configure the kernel loader before the
  first `load()` call.
- Unit tests should be able to install `MemoryKernel` from `solidark/base/kernel`
  through `globalThis.kernel` without loading OpenCascade.js or WebAssembly.

## Evaluation Pipeline

Evaluation should proceed through these phases:

1. Wait for the runtime load promise if the kernel is not available.
2. Flush scheduled renders for the target model subtree.
3. Wait for relevant custom element definitions to be upgraded.
4. Normalize the DOM tree into an internal model tree.
5. Validate component properties and child geometry kinds.
6. Resolve parameters and inherited context.
7. Delegate each component node to its component class.
8. Apply transforms and placements.
9. Apply CSG operations and B-Rep features.
10. Heal or validate the resulting topology if requested.
11. Return a Solidark `EvaluationResult`.

```ts
export type EvaluationResult = {
  element: Component;
  model: NormalizedModel;
  shapes: Shape[];
  meshes: RenderableMesh[];
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
- Serializable properties.
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
type RenderableMesh = {
  tag: string;
  vertices: number[][];
  triangles: number[][];
};

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
Kernels may expose `toMesh(shape, options)` so the runtime can include
`result.meshes` beside exact B-Rep-backed `result.shapes`. The in-memory kernel
is not required to generate meshes, which keeps unit tests deterministic and
fast unless a test explicitly targets visualization output.

## CAD Viewer

Solidark should provide a direct way to visualize model changes in the browser.
This does not make Solidark a graphical CAD editor: geometry definition and
editing should still happen in HTML, JavaScript components, tests, and source
files. The viewer should be a visualization, inspection, and development
feedback tool.

The primary Solidark viewer should feel closer to a CAD viewport than to a
product model embed. A generic GLB viewer such as `<model-viewer>` is useful as
a low-effort fallback and web-publishing target, but it should not be the
long-term primary viewer because it does not naturally expose CAD affordances
such as edge display, section planes, precise camera presets, selection, or
component inspection.

Solidark should therefore provide a native Three.js-backed viewer adapter as
the preferred browser visualization path. It should consume `EvaluationResult`
objects and render `result.meshes` directly where possible, avoiding an
unnecessary GLB round trip during development. GLB export should remain
available for interchange, snapshots, and fallback display through
`<model-viewer>`.

CascadeStudio is a useful reference for the desired browser CAD feel because it
combines OpenCascade.js with Three.js in a live scripted CAD environment.
Solidark should use CascadeStudio as inspiration for viewport behavior, but
should not depend on CascadeStudio as a library. CascadeStudio is a full CAD IDE
with editor, layout, GUI, import/export, and project-management concerns;
Solidark should keep those responsibilities out of the core viewer.

Viewer requirements:

- Provide `<sol-viewer>` as an optional Web Component that references a
  Solidark model element, evaluates it, and visualizes the resulting geometry.
- Keep built-in modeling elements focused on model definition and evaluation;
  visualization should live in `solidark/viewer` or `solidark/external`.
- Keep the viewer optional for production modeling code so headless tests and
  server-side evaluation do not load browser rendering dependencies.
- Prefer a Three.js CAD viewport for interactive browser inspection.
- Keep `<model-viewer>` available as a fallback renderer for GLB previews,
  publishing, and environments where the CAD viewer is not loaded.
- Support refreshing the display after a component property, attribute, or DOM
  subtree changes.
- Expose a small programmatic API suitable for development tools and tests, for
  example `viewer.render(result)`, `viewer.refresh(element)`, `viewer.clear()`,
  and a `ready` promise that resolves only after evaluation and rendering have
  completed.
- Preserve component-to-geometry mapping where practical so changed or selected
  components can be highlighted.

Initial CAD viewport capabilities:

- Orbit, pan, zoom, and fit-to-model controls.
- Orthographic and perspective camera modes.
- Named view presets such as top, front, right, and isometric.
- Axes, grid, and optional view cube or orientation widget.
- Axis labels should remain visible and interactive; clicking an axis label
  should toggle the rendered axis lines without changing the model.
- Grid display should be configurable from `<sol-viewer>`. The grid should be
  visible by default, represent a 10 mm by 10 mm working area by default, support a
  `grid="false"` attribute to hide it initially, and support `grid-size` for
  choosing its minimum width and height in millimeters. If the evaluated model
  footprint exceeds the configured grid size, the rendered grid should expand
  and center under the model so the full XY footprint remains covered.
- Shaded faces with configurable material color from Solidark styling metadata.
- Edge outlines over shaded faces, including silhouette edges where practical.
- Transparent or X-ray display mode.
- Section or clipping planes for inspecting interiors.
- Per-component or per-shape hover and selection highlighting.
- Bounds display and camera framing based on evaluated model extents.
- Empty, loading, and diagnostic states that are visible in the viewer surface.

The first implementation may start with a smaller Three.js renderer, but its
architecture should leave room for the capabilities above. Viewer code should
not mutate model geometry and should not become a graphical editor. Selection
and inspection may report component metadata, but editing actions should remain
source-code-driven.

## Import and Export

Initial export targets:

- STEP for precise CAD exchange.
- STL for mesh-based manufacturing workflows.
- OBJ or GLB for web visualization workflows.
- BREP for kernel-native debugging and interchange.

Export should be available through small helper functions and kernel methods.
For example, `exportShapeToStep(shape, { kernel })`,
`exportShapeToStl(shape, { kernel })`, and
`exportShapeToBrep(shape, { kernel })` should delegate to `kernel.toStep()`,
`kernel.toStl()`, and `kernel.toBrep()` when the active kernel supports precise
CAD export. The OpenCascade-backed kernel should use the OpenCascade virtual
file system and writer APIs for STEP, STL, and BREP, then return the exported
file contents to the caller. In-memory kernels may return `null` for these
methods.

Evaluated runtime results should be exportable directly through
`exportResultToStep(result, options)`, `exportResultToStl(result, options)`,
and `exportResultToBrep(result, options)`. If the result has a single root
shape, that shape should be exported directly. If it has multiple root shapes,
the helper should group them through the active kernel when possible; callers
may pass `shape: "first"` when they intentionally want to export only the first
root shape.

Browser-oriented helpers should also be available for download flows:
`downloadResultToStep(result, options)`, `downloadResultToStl(result, options)`,
and `downloadResultToBrep(result, options)`. These helpers should create the
appropriate `Blob`, object URL, hidden anchor, click it, and clean up the object
URL afterward. The showcase may use these helpers to expose STEP, STL, and BREP
downloads for every evaluated example.

Initial import targets:

- STEP as an external shape or assembly component.
- STL as an imported mesh component that can participate in visualization and
  mesh workflows.
- BREP as a kernel-native external shape component.

Imported STEP assemblies should preserve their hierarchy in the first release.
Imported shapes should participate in transforms, booleans, features, and
assemblies like any other Solidark shape when their geometry kind supports the
requested operation. Imported STL meshes should remain mesh geometry unless
explicitly converted or reconstructed into a B-Rep shape by a dedicated feature.

## Diagnostics and Errors

Errors should be typed and actionable.

Required error categories:

- Invalid properties.
- Invalid child geometry kind.
- Kernel load failure.
- Kernel operation failure.
- Boolean operation failure.
- Topology validation failure.
- Mesh conversion failure.
- Export failure.

Diagnostics should include:

- Component path in the normalized tree.
- Operation name.
- Source component name or id when available.
- Kernel message when available.
- A stable machine-readable `errorCategory` value.
- Suggested user action when the issue is predictable.

The browser showcase and `<sol-viewer>` should surface the same diagnostics in a
developer-readable form. When a failure is predictable, the displayed message
should include both the low-level kernel cause and a short suggestion, such as
checking numeric attributes, kernel import/WASM configuration, topology
selectors, or whether the shape can be triangulated for display.

## Package Structure

Potential package layout:

- `solidark`: core public API.
- `solidark/base`: base `Component` hierarchy and component class helpers.
- `solidark/structures`: higher-level structural elements such as `sol-model`,
  with one structure per source file.
- `solidark/primitives`: primitive element components, with one primitive per
  source file.
- `solidark/transform`: transformation element components, with one transform
  per source file.
- `solidark/operation`: CSG operation components, with one operation per source
  file.
- `solidark/feature`: B-Rep features, sketch actions, and file importers, with
  one component per source file.
- `solidark/base/kernel`: abstract `Kernel` class, `MemoryKernel`, and global
  kernel accessors.
- `solidark/runtime`: runtime scheduling, loading, flushing, and evaluation.
- `solidark/runtime/kernel`: kernel selection helpers and concrete runtime
  adapters.
- `solidark/runtime/kernel/opencascade`: `OpencascadeKernel` adapter.
- `solidark/elements`: aggregate built-in component exports and compatibility
  helpers.
- `solidark/mesh`: optional mesh conversion helpers if they are not part of
  the core entry point.
- `solidark/viewer`: optional browser visualization helpers and custom elements.
- `solidark/testing`: geometry assertions and test helpers.

The core package should avoid importing viewer integrations by default.

## Typing Strategy

Solidark should be written in plain JavaScript while remaining friendly to
TypeScript users.

Requirements:

- Source should use JSDoc where it clarifies public contracts.
- Public APIs should ship TypeScript declaration files.
- Declaration files may be generated from JSDoc or maintained by hand.
- Properties should be documented and typed.
- Geometry kind constraints should be represented in types where practical.
- Runtime validation must still exist because plain JavaScript users are a first
  class audience.
- JSX type declarations are not required and should not be part of the core
  design.

## Testing and Conformance

The specification should be backed by tests once implementation begins.
Testability should be treated as part of the public developer experience, not as
an internal maintenance detail.

Source and test layout:

- Every implemented source file must be accompanied by a corresponding unit test
  file in the same directory.
- Test files should use Node's built-in test framework, `node:test`.
- Assertions should use `node:assert/strict` unless a focused helper from
  `solidark/testing` makes the intent clearer.
- The recommended naming convention is `name.js` with `name.test.js` beside it.
- The project should aim for 100% test coverage at all times.
- Lines may be excluded from coverage only when explicitly ignored for a
  deliberate convenience case, and the ignore should remain narrow.
- Generated files, declaration files, and static assets may be excluded from the
  adjacent-test rule.
- Browser-only behavior should still have adjacent unit tests for scheduling,
  DOM integration, and API contracts; broader browser rendering checks may live
  in an integration test suite.

Recommended test categories:

- Attribute and property parsing.
- Component lifecycle scheduling.
- Async load and evaluation promise behavior.
- Primitive dimensions and bounding boxes.
- Transform composition.
- Boolean operation behavior.
- B-Rep feature behavior.
- Serialization of normalized trees.
- Browser visualization update behavior.
- Export smoke tests.
- Kernel object disposal tests.
- Cross-runtime tests for browsers and DOM-capable worker or server
  environments.

Geometry tests should avoid relying only on mesh snapshots. Prefer analytic
checks, bounding boxes, volumes, topology counts, or STEP round trips where
possible.

## Initial MVP Scope

The first useful release should include:

- Base `Component extends HTMLElement` class.
- Built-in custom elements for core modeling concepts.
- DOM tree normalization and validation.
- OpenCascade.js kernel adapter.
- Promise-based runtime loading through `load()`.
- Deferred render and evaluation scheduling.
- Core 3D primitives: `<sol-cuboid>`, `<sol-sphere>`,
  `<sol-cylinder>`, `<sol-cone>`.
- Core transforms: `<sol-translate>`, `<sol-rotate>`,
  `<sol-scale>`, `<sol-mirror>`.
- Core booleans: `<sol-union>`, `<sol-difference>`,
  `<sol-intersection>`.
- Minimal sketch profiles.
- `<sol-extrude>` and `<sol-revolve>`.
- `<sol-fillet>` and `<sol-chamfer>`.
- Triangulation for display.
- `<sol-viewer>` with a minimal Three.js-backed CAD viewport for inspecting
  evaluated model changes.
- GLB and `<model-viewer>` fallback visualization for simple previews and web
  publishing.
- STEP and STL export.
- Clear diagnostics.
- JSDoc annotations and TypeScript declaration files.

Features that can wait:

- Constraint-based sketches.
- Full assembly metadata export.
- Advanced selectors.
- Loft and sweep if they complicate the first kernel adapter.
- Advanced viewer features such as section planes, view cube, detailed part
  tree, and topology-level inspection.
- Custom OpenCascade.js build tooling.

Out of scope unless this specification later changes:

- JSX support.
- React-style function components.
- Factory-helper authoring APIs.

## Open Questions

No open questions are currently recorded.

## References

- OpenCascade.js: https://ocjs.org/
- OpenCascade.js project page: https://dev.opencascade.org/project/opencascadejs
- Componark repository: https://github.com/librark/componark
- Componark package documentation: https://libraries.io/npm/%40knowark%2Fcomponarkjs
