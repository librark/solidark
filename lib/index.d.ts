export class Component extends HTMLElement {
  static tag: string;
  static defaultProperties: Record<string, unknown>;
  static observedAttributes: string[];
  static define(tag?: string): typeof Component;
  readonly properties: Record<string, unknown>;
  content: string;
  init(properties?: Record<string, unknown>): this;
  render(): this;
  load(): Promise<unknown>;
  evaluate(): Promise<EvaluationResult>;
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
  diagnostics: unknown[];
  dispose(): void;
};

export type RenderableMesh = {
  tag: string;
  vertices: number[][];
  triangles: number[][];
};

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

export type GlbObjectUrl = {
  blob: Blob;
  url: string;
};

export type KernelShape = {
  category: string;
  tag: string;
  properties: Record<string, unknown>;
  children: KernelShape[];
  value?: unknown;
  handles?: unknown[];
  disposed: boolean;
};

export type KernelMethod = (
  properties?: Record<string, unknown>,
  children?: KernelShape[]
) => KernelShape;

export type Kernel = {
  name: string;
  cuboid: KernelMethod;
  sphere: KernelMethod;
  cylinder: KernelMethod;
  cone: KernelMethod;
  torus: KernelMethod;
  circle: KernelMethod;
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
  close: KernelMethod;
  step: KernelMethod;
  stl: KernelMethod;
  brep: KernelMethod;
  toMesh?: (
    entry: KernelShape,
    options?: Record<string, unknown>
  ) => RenderableMesh | RenderableMesh[] | null | undefined;
  dispose(entry: KernelShape): void;
};

export const BrepComponent: typeof Component;
export const ChamferComponent: typeof Component;
export const CircleComponent: typeof Component;
export const CloseComponent: typeof Component;
export const ConeComponent: typeof Component;
export const CuboidComponent: typeof Component;
export const CylinderComponent: typeof Component;
export const DifferenceComponent: typeof Component;
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
export function exportMeshesToGlb(meshes?: RenderableMesh[], options?: { generator?: string }): ArrayBuffer;
export function createGlbBlob(meshes?: RenderableMesh[], options?: { generator?: string }): Blob;
export function createGlbObjectUrl(
  meshes?: RenderableMesh[],
  options?: { generator?: string },
  url?: { createObjectURL?: (blob: Blob) => string }
): GlbObjectUrl;

declare global {
  var kernel: unknown;
}

export function normalizeElement(element: Element): NormalizedNode;
export function producesGeometry(node: NormalizedNode): boolean;
export const kernelMethodDefinitions: readonly {
  tag: string;
  method: string;
  category: string;
}[];
export const kernelMethodByTag: Readonly<Record<string, string>>;
export const kernelCategoryByMethod: Readonly<Record<string, string>>;
export const kernelTagByMethod: Readonly<Record<string, string>>;
export function kernelMethodForTag(tag: string): string | null;
export function requireKernelMethod(kernel: Record<string, unknown>, tag: string): KernelMethod | null;
export function createDescriptorKernel(): Kernel;
export function createInMemoryKernel(): Kernel;
export function constructOpenCascadeBinding(
  openCascade: Record<string, unknown>,
  names: string[],
  args?: unknown[]
): unknown;
export function createOpenCascadeAdapter(openCascade: unknown): Kernel & { openCascade: unknown };
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
}): Promise<Kernel & { openCascade: unknown }>;
export function getGlobalKernel(target?: Record<string, unknown>): unknown;
export function setGlobalKernel(kernel: unknown, target?: Record<string, unknown>): unknown;
export function clearGlobalKernel(target?: Record<string, unknown>): Record<string, unknown>;
export function loadGlobalKernel(options?: {
  target?: Record<string, unknown>;
  factory?: () => unknown;
}): unknown;
export function useInMemoryKernel(options?: { target?: Record<string, unknown> }): Kernel;
export function evaluateNode(node: NormalizedNode, kernel?: Kernel): KernelShape[];
export function createViewer(target?: ViewerTarget | null): Viewer;
export function createSceneSvg(shapes?: KernelShape[]): string;
export function collectPrimitiveEntries(shapes: KernelShape[]): KernelShape[];
export function createModelViewerScene(
  target: ViewerTarget,
  meshes?: RenderableMesh[],
  options?: { urlApi?: typeof URL }
): ModelViewerRenderer;
export function createMeshSceneCanvas(target: ViewerTarget, meshes?: RenderableMesh[]): CanvasMeshRenderer;
export function createMeshSceneSvg(meshes?: RenderableMesh[]): string;
export function collectMeshTriangles(meshes?: RenderableMesh[]): ProjectedTriangle[];

export class Viewer {
  constructor(target?: ViewerTarget | null);
  render(result: EvaluationResult | { shapes?: KernelShape[]; meshes?: RenderableMesh[] }): this;
  clear(): this;
  disposeRenderer(): this;
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
