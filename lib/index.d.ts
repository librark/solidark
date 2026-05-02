export class Component extends HTMLElement {
  static tag: string;
  static category: string;
  static geometryKind: string | null;
  static shapeGeometryKind: string | null | undefined;
  static childGeometryKinds: string[] | string | null | undefined;
  static defaultProperties: Record<string, unknown>;
  static observedAttributes: string[];
  static shapeTag: string | null;
  static shapeCategory: string | null;
  static readonly kernel: unknown;
  static define(tag?: string): typeof Component;
  static evaluateNode(
    node: Partial<NormalizedNode>,
    children: KernelShape[],
    kernel?: Kernel
  ): KernelShape[];
  static createKernelShape(
    properties?: Record<string, unknown>,
    children?: KernelShape[],
    kernel?: Kernel
  ): KernelShape;
  static build(
    properties: Record<string, unknown>,
    children: KernelShape[],
    kernel: Kernel
  ): KernelShape | null;
  static decorateKernelShape(shape: KernelShape): KernelShape;
  static validateChildGeometry(
    children?: KernelShape[],
    allowedKinds?: string[] | string | null
  ): typeof Component;
  static childGeometryKindsForValidation(): string[] | string | null;
  readonly kernel: unknown;
  readonly properties: Record<string, unknown>;
  content: string;
  init(properties?: Record<string, unknown>): this;
  render(): this;
  load(): Promise<unknown>;
  evaluate(): Promise<EvaluationResult>;
}

export class SolidarkChildGeometryError extends TypeError {
  componentTag: string;
  childTag: string;
  childGeometryKind: string;
  allowedGeometryKinds: string[];
}

export class ViewerComponent extends Component {
  static tag: "sol-viewer";
  static category: "external";
  static geometryKind: null;
  refresh(
    target?: Element | null,
    options?: { runtime?: { evaluate(element: Element): Promise<EvaluationResult> } }
  ): Promise<EvaluationResult>;
  clear(): this;
  showError(error: unknown): this;
  resolveTarget(): Element | null;
}

export type NormalizedNode = {
  tag: string;
  category: string;
  geometryKind: string | null;
  properties: Record<string, unknown>;
  children: NormalizedNode[];
  implicitUnion: boolean;
};

export type EvaluationResult = {
  element: Component;
  model: NormalizedNode;
  shapes: KernelShape[];
  meshes: RenderableMesh[];
  diagnostics: EvaluationDiagnostic[];
  dispose(): void;
};

export type EvaluationDiagnostic = {
  level: string;
  stage: string;
  tag: string;
  category?: string;
  errorCategory?: string;
  method: string;
  path: string;
  properties: Record<string, unknown>;
  cause: string;
  suggestion?: string;
};

export type RenderableMesh = {
  tag: string;
  vertices: number[][];
  triangles: number[][];
  styling?: ShapeStyling;
  color?: unknown;
};

export type ShapeStyling = {
  color?: unknown;
};

export type TopologyNames = {
  edges: Record<string, unknown>;
  faces: Record<string, unknown>;
};

export function parseTopologyNames(
  value: string | Record<string, unknown> | null | undefined
): TopologyNames | null;

export function parseTopologySelector(
  selection: string | number | unknown[],
  count: number
): Set<number>;

export function resolveTopologySelector(
  selection: string | number | unknown[],
  count: number,
  namedSelectors?: Record<string, unknown>
): Set<number>;

export type ProjectedTriangle = {
  meshIndex: number;
  vertices: number[][];
  projected: number[][];
  depth: number;
};

export type ViewerTarget = {
  innerHTML?: string;
  textContent?: string;
  appendChild?: (child: unknown) => unknown;
  replaceChildren?: (...children: unknown[]) => void;
  ownerDocument?: Document;
};

export type ViewerOptions = {
  axesVisible?: boolean;
  cameraMode?: "orthographic" | "perspective";
  edgesVisible?: boolean;
  fitMargin?: number;
  gridSize?: number;
  gridVisible?: boolean;
  view?: "front" | "isometric" | "right" | "top";
  xray?: boolean;
  three?: unknown;
  renderer?: unknown;
};

export type GlbObjectUrl = {
  blob: Blob;
  url: string;
};

export type CadExportDownload = {
  blob: Blob;
  url: string;
  anchor: HTMLAnchorElement;
  filename: string;
};

export type CadExportOptions = Record<string, unknown> & {
  Blob?: typeof Blob;
  document?: Document;
  filename?: string;
  kernel?: {
    group?: (properties?: Record<string, unknown>, children?: KernelShape[]) => KernelShape;
    toBrep?: (entry: KernelShape, options?: Record<string, unknown>) => string | Uint8Array;
    toStep?: (entry: KernelShape, options?: Record<string, unknown>) => string | Uint8Array;
    toStl?: (entry: KernelShape, options?: Record<string, unknown>) => string | Uint8Array;
  };
  mimeType?: string;
  shape?: "first" | "group";
  url?: typeof URL;
};

export type KernelShape = {
  method: string;
  category?: string;
  tag?: string;
  geometryKind?: string;
  properties: Record<string, unknown>;
  children: KernelShape[];
  styling?: ShapeStyling;
  topology?: TopologyNames;
  value?: unknown;
  handles?: unknown[];
  disposed: boolean;
};

export type KernelMethod = (
  properties?: Record<string, unknown>,
  children?: KernelShape[]
) => KernelShape;

export abstract class Kernel {
  name: string;
  constructor(options?: { name?: string });
  createShape(
    method: string,
    properties?: Record<string, unknown>,
    children?: KernelShape[]
  ): KernelShape;
  toMesh(
    entry: KernelShape,
    options?: Record<string, unknown>
  ): RenderableMesh | RenderableMesh[] | null | undefined;
  toBrep(entry: KernelShape, options?: Record<string, unknown>): string | Uint8Array | null;
  toStep(entry: KernelShape, options?: Record<string, unknown>): string | Uint8Array | null;
  toStl(entry: KernelShape, options?: Record<string, unknown>): string | Uint8Array | null;
  dispose(entry: KernelShape): void;
  abstract cuboid: KernelMethod;
  abstract sphere: KernelMethod;
  abstract cylinder: KernelMethod;
  abstract cone: KernelMethod;
  abstract torus: KernelMethod;
  abstract circle: KernelMethod;
  abstract ellipse: KernelMethod;
  abstract rectangle: KernelMethod;
  abstract polygon: KernelMethod;
  abstract polyline: KernelMethod;
  abstract translate: KernelMethod;
  abstract rotate: KernelMethod;
  abstract scale: KernelMethod;
  abstract mirror: KernelMethod;
  abstract matrix: KernelMethod;
  abstract place: KernelMethod;
  abstract workplane: KernelMethod;
  abstract union: KernelMethod;
  abstract difference: KernelMethod;
  abstract intersection: KernelMethod;
  abstract group: KernelMethod;
  abstract color: KernelMethod;
  abstract fillet: KernelMethod;
  abstract chamfer: KernelMethod;
  abstract shell: KernelMethod;
  abstract offset: KernelMethod;
  abstract extrude: KernelMethod;
  abstract revolve: KernelMethod;
  abstract sweep: KernelMethod;
  abstract loft: KernelMethod;
  abstract section: KernelMethod;
  abstract face: KernelMethod;
  abstract sketch: KernelMethod;
  abstract move: KernelMethod;
  abstract line: KernelMethod;
  abstract arc: KernelMethod;
  abstract close: KernelMethod;
  abstract step: KernelMethod;
  abstract stl: KernelMethod;
  abstract brep: KernelMethod;
}

export class MemoryKernel extends Kernel {
  constructor();
  cuboid: KernelMethod;
  sphere: KernelMethod;
  cylinder: KernelMethod;
  cone: KernelMethod;
  torus: KernelMethod;
  circle: KernelMethod;
  ellipse: KernelMethod;
  rectangle: KernelMethod;
  polygon: KernelMethod;
  polyline: KernelMethod;
  translate: KernelMethod;
  rotate: KernelMethod;
  scale: KernelMethod;
  mirror: KernelMethod;
  matrix: KernelMethod;
  place: KernelMethod;
  workplane: KernelMethod;
  union: KernelMethod;
  difference: KernelMethod;
  intersection: KernelMethod;
  group: KernelMethod;
  color: KernelMethod;
  fillet: KernelMethod;
  chamfer: KernelMethod;
  shell: KernelMethod;
  offset: KernelMethod;
  extrude: KernelMethod;
  revolve: KernelMethod;
  sweep: KernelMethod;
  loft: KernelMethod;
  section: KernelMethod;
  face: KernelMethod;
  sketch: KernelMethod;
  move: KernelMethod;
  line: KernelMethod;
  arc: KernelMethod;
  close: KernelMethod;
  step: KernelMethod;
  stl: KernelMethod;
  brep: KernelMethod;
}

export class OpencascadeKernel extends MemoryKernel {
  openCascade: unknown;
  constructor(openCascade: unknown);
  toBrep(entry: KernelShape, options?: Record<string, unknown>): string | Uint8Array;
  toStep(entry: KernelShape, options?: Record<string, unknown>): string | Uint8Array;
  toStl(entry: KernelShape, options?: Record<string, unknown>): string | Uint8Array;
}

export class SolidarkEvaluationError extends Error {
  diagnostic: EvaluationDiagnostic;
  diagnostics: EvaluationDiagnostic[];
  cause?: unknown;
  constructor(diagnostic: EvaluationDiagnostic, cause?: unknown);
}

export const BrepComponent: typeof Component;
export const ArcComponent: typeof Component;
export const ChamferComponent: typeof Component;
export const CircleComponent: typeof Component;
export const ColorComponent: typeof Component;
export const CloseComponent: typeof Component;
export const ConeComponent: typeof Component;
export const CuboidComponent: typeof Component;
export const CylinderComponent: typeof Component;
export const DifferenceComponent: typeof Component;
export const EllipseComponent: typeof Component;
export const ExtrudeComponent: typeof Component;
export const FaceComponent: typeof Component;
export const FilletComponent: typeof Component;
export const GroupComponent: typeof Component;
export const IntersectionComponent: typeof Component;
export const LineComponent: typeof Component;
export const LoftComponent: typeof Component;
export const MatrixComponent: typeof Component;
export const MirrorComponent: typeof Component;
export const ModelComponent: typeof Component;
export const MoveComponent: typeof Component;
export const OffsetComponent: typeof Component;
export const PlaceComponent: typeof Component;
export const PolygonComponent: typeof Component;
export const PolylineComponent: typeof Component;
export const RectangleComponent: typeof Component;
export const RevolveComponent: typeof Component;
export const RotateComponent: typeof Component;
export const ScaleComponent: typeof Component;
export const SectionComponent: typeof Component;
export const ShellComponent: typeof Component;
export const SketchComponent: typeof Component;
export const SphereComponent: typeof Component;
export const StepComponent: typeof Component;
export const StlComponent: typeof Component;
export const SweepComponent: typeof Component;
export const TorusComponent: typeof Component;
export const TranslateComponent: typeof Component;
export const UnionComponent: typeof Component;
export const WorkplaneComponent: typeof Component;
export const builtInElements: readonly (typeof Component)[];
export function defineSolidarkElements(): readonly (typeof Component)[];
export const html: typeof String.raw;
export function camelCase(value: string): string;
export function parseVector(value: string | number[] | { x?: number; y?: number; z?: number }): number[];
export function parseAttributeValue(value: string): boolean | number | number[] | string;
export function stableStringify(value: unknown): string;
export const GLB_MIME_TYPE: "model/gltf-binary";
export const BREP_MIME_TYPE: "model/vnd.opencascade.brep";
export const STEP_MIME_TYPE: "model/step";
export const STL_MIME_TYPE: "model/stl";
export function exportMeshesToGlb(meshes?: RenderableMesh[], options?: { generator?: string }): ArrayBuffer;
export function createGlbBlob(meshes?: RenderableMesh[], options?: { generator?: string }): Blob;
export function createGlbObjectUrl(
  meshes?: RenderableMesh[],
  options?: { generator?: string },
  url?: { createObjectURL?: (blob: Blob) => string }
): GlbObjectUrl;
export function createCadExportBlob(data: string | Uint8Array, mimeType: string, BlobConstructor?: typeof Blob): Blob;
export function createCadExportObjectUrl(data: string | Uint8Array, options?: CadExportOptions): GlbObjectUrl;
export function downloadCadExport(data: string | Uint8Array, options?: CadExportOptions): CadExportDownload;
export function downloadResultToBrep(result: EvaluationResult | KernelShape, options?: CadExportOptions): CadExportDownload;
export function downloadResultToStep(result: EvaluationResult | KernelShape, options?: CadExportOptions): CadExportDownload;
export function downloadResultToStl(result: EvaluationResult | KernelShape, options?: CadExportOptions): CadExportDownload;
export function exportResultToBrep(result: EvaluationResult | KernelShape, options?: CadExportOptions): string | Uint8Array;
export function exportResultToStep(result: EvaluationResult | KernelShape, options?: CadExportOptions): string | Uint8Array;
export function exportResultToStl(result: EvaluationResult | KernelShape, options?: CadExportOptions): string | Uint8Array;
export function exportShapeToBrep(
  entry: KernelShape,
  options?: CadExportOptions
): string | Uint8Array;
export function exportShapeToStep(
  entry: KernelShape,
  options?: CadExportOptions
): string | Uint8Array;
export function exportShapeToStl(
  entry: KernelShape,
  options?: CadExportOptions
): string | Uint8Array;

declare global {
  var kernel: unknown;
}

export function normalizeElement(element: Element): NormalizedNode;
export function producesGeometry(node: NormalizedNode): boolean;
export function createDescriptorKernel(): MemoryKernel;
export function createInMemoryKernel(): MemoryKernel;
export function constructOpenCascadeBinding(
  openCascade: Record<string, unknown>,
  names: string[],
  args?: unknown[]
): unknown;
export function createOpenCascadeAdapter(openCascade: unknown): OpencascadeKernel;
export function loadOpenCascade(options?: {
  importer?: (specifier: string) => Promise<{
    initOpenCascade?: (options?: unknown) => unknown;
    default?: (options?: unknown) => unknown;
  }>;
  initOptions?: unknown;
}): Promise<unknown>;
export function createOpenCascadeKernel(options?: {
  importer?: (specifier: string) => Promise<{
    initOpenCascade?: (options?: unknown) => unknown;
    default?: (options?: unknown) => unknown;
  }>;
  initOptions?: unknown;
}): Promise<OpencascadeKernel>;
export function getGlobalKernel(target?: Record<string, unknown>): unknown;
export function setGlobalKernel(kernel: unknown, target?: Record<string, unknown>): unknown;
export function clearGlobalKernel(target?: Record<string, unknown>): Record<string, unknown>;
export function loadGlobalKernel(options?: {
  target?: Record<string, unknown>;
  factory?: () => unknown;
}): unknown;
export function useInMemoryKernel(options?: { target?: Record<string, unknown> }): MemoryKernel;
export function evaluateNode(node: NormalizedNode, kernel?: Kernel): KernelShape[];
export function createViewer(target?: ViewerTarget | null, options?: ViewerOptions): Viewer;
export function createSceneSvg(shapes?: KernelShape[]): string;
export function collectPrimitiveEntries(shapes: KernelShape[]): KernelShape[];
export function canUseThreeTarget(target?: ViewerTarget | null, options?: ViewerOptions): boolean;
export function createThreeCadScene(
  target: ViewerTarget,
  meshes?: RenderableMesh[],
  options?: ViewerOptions
): ThreeCadRenderer;
export function createModelViewerScene(
  target: ViewerTarget,
  meshes?: RenderableMesh[],
  options?: { urlApi?: typeof URL }
): ModelViewerRenderer;
export function createMeshSceneCanvas(target: ViewerTarget, meshes?: RenderableMesh[]): CanvasMeshRenderer;
export function createMeshSceneSvg(meshes?: RenderableMesh[]): string;
export function collectMeshTriangles(meshes?: RenderableMesh[]): ProjectedTriangle[];

export class Viewer {
  readonly target: ViewerTarget | null;
  readonly options: ViewerOptions;
  result: EvaluationResult | { shapes?: KernelShape[]; meshes?: RenderableMesh[] } | null;
  renderer: { dispose(): unknown } | null;
  constructor(target?: ViewerTarget | null, options?: ViewerOptions);
  render(result: EvaluationResult | { shapes?: KernelShape[]; meshes?: RenderableMesh[] }): this;
  clear(): this;
  disposeRenderer(): this;
}

export class ThreeCadRenderer {
  readonly target: ViewerTarget;
  readonly meshes: RenderableMesh[];
  readonly three: unknown;
  readonly root: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly viewport: HTMLElement;
  readonly renderer: unknown;
  constructor(target: ViewerTarget, meshes?: RenderableMesh[], options?: ViewerOptions);
  createToolbar(): void;
  createScene(): void;
  createMeshEntry(mesh: RenderableMesh, index: number): unknown;
  attach(): this;
  dispose(): this;
  view(name: "front" | "isometric" | "right" | "top"): this;
  fit(): this;
  toggleAxes(): this;
  toggleCamera(): this;
  toggleEdges(): this;
  toggleGrid(): this;
  toggleXray(): this;
  startDrag(event: PointerEvent): this;
  dragView(event: PointerEvent): this;
  pan(dx: number, dy: number): void;
  stopDrag(): this;
  zoomBy(event: WheelEvent): this;
  resize(): void;
  render(): this;
  positionCamera(): void;
}

export class ModelViewerRenderer {
  constructor(
    target: ViewerTarget,
    meshes?: RenderableMesh[],
    options?: { urlApi?: typeof URL }
  );
  readonly target: ViewerTarget;
  readonly meshes: RenderableMesh[];
  object: GlbObjectUrl | null;
  element: HTMLElement;
  dispose(): this;
}

export class CanvasMeshRenderer {
  constructor(canvas: HTMLCanvasElement, meshes?: RenderableMesh[]);
  attach(): this;
  dispose(): this;
  reset(): this;
  startDrag(event: PointerEvent): this;
  dragView(event: PointerEvent): this;
  stopDrag(): this;
  zoomBy(event: WheelEvent): this;
  draw(): this;
}

export class Runtime {
  constructor(options?: { kernel?: unknown; loader?: () => unknown });
  configure(options?: { kernel?: unknown; loader?: () => unknown }): this;
  load(): Promise<unknown>;
  schedule<T>(callback: () => T, options?: { macro?: boolean }): Promise<T>;
  evaluate(element: Element): Promise<EvaluationResult>;
  flush(element: Element): Promise<Element>;
  resetForTests(): this;
}

export const SolidarkRuntime: Runtime;
