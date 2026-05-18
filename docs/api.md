# Public API

Solidark exposes a small set of npm entrypoints. Anything below `lib/` or below
unlisted package subpaths is private implementation detail.

## `@librark/solidark`

Core convenience entrypoint for common authoring and evaluation APIs.

Primary exports include:

- `Component`
- `html`
- `defineSolidarkElements`
- `SolidarkRuntime`
- `Runtime`
- `evaluateNode`
- `normalizeElement`
- `createInMemoryKernel`
- `createOpenCascadeKernel`

Prefer a vertical entrypoint when you only need one subsystem.

## `@librark/solidark/cdn`

CDN bootstrap helpers for plain HTML usage.

- `bootSolidarkCdn()`
- `configureCdnKernel()`
- `createOpenCascadeCdnInitOptions()`
- `loadCdnThree()`
- `cdnPackageUrl()`
- `Component`
- `html`
- `SolidarkRuntime`

## `@librark/solidark/component`

Base component APIs for user-defined parametric elements.

- `Component`
- `SolidarkChildGeometryError`
- `html`
- `parseAttributeValue()`
- `parseVector()`

## `@librark/solidark/elements`

Built-in Solidark Web Component classes and registration helpers.

- Primitive components such as `CuboidComponent`, `CylinderComponent`, and
  `SphereComponent`
- Transform components such as `TranslateComponent`, `RotateComponent`, and
  `ScaleComponent`
- Operation components such as `UnionComponent`, `DifferenceComponent`, and
  `IntersectionComponent`
- Feature components such as `ExtrudeComponent`, `FilletComponent`, and
  `ChamferComponent`
- `ModelComponent`
- `ViewerComponent`
- `builtInElements`
- `defineSolidarkElements()`

## `@librark/solidark/runtime`

Runtime scheduling, loading, normalization, and evaluation.

- `Runtime`
- `SolidarkRuntime`
- `SolidarkEvaluationError`
- `evaluateNode`
- `parseTopologyNames`
- `parseTopologySelector`
- `resolveTopologySelector`

## `@librark/solidark/kernel`

Kernel contracts and concrete kernel adapters.

- `Kernel`
- `MemoryKernel`
- `OpencascadeKernel`
- `createInMemoryKernel()`
- `createDescriptorKernel()`
- `createOpenCascadeKernel()`
- `createOpenCascadeAdapter()`
- `loadOpenCascade()`
- `getGlobalKernel()`
- `setGlobalKernel()`
- `clearGlobalKernel()`
- `loadGlobalKernel()`
- `useInMemoryKernel()`

## `@librark/solidark/viewer`

Browser-oriented viewing helpers.

- `ViewerComponent`
- `Viewer`
- `ThreeCadRenderer`
- `ModelViewerRenderer`
- `CanvasMeshRenderer`
- `createViewer()`
- `createThreeCadScene()`
- `createModelViewerScene()`
- `createMeshSceneCanvas()`
- `createSceneSvg()`
- `createMeshSceneSvg()`

## `@librark/solidark/export`

Export helpers for evaluated Solidark results and renderable meshes.

- `exportResultToBrep()`
- `exportResultToStep()`
- `exportResultToStl()`
- `exportShapeToBrep()`
- `exportShapeToStep()`
- `exportShapeToStl()`
- `exportMeshesToGlb()`
- `exportMeshesToStl()`
- `createGlbBlob()`
- `createGlbObjectUrl()`
- `downloadResultToBrep()`
- `downloadResultToStep()`
- `downloadResultToStl()`

## `@librark/solidark/robot`

Robot extension APIs.

- Robot component classes such as `RobotComponent`, `RobotLinkComponent`, and
  `RobotJointComponent`
- `defineRobotElements()`
- `compileRobotDefinition()`
- `createRobotDefinitionBundle()`
- `exportRobotJson()`

## Compatibility Policy

For the first external release, SemVer applies to the listed package entrypoints
and the exported names documented here. Internal module paths are intentionally
blocked by `package.json` exports.
