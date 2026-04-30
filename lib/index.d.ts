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
  shapes: unknown[];
  diagnostics: unknown[];
  dispose(): void;
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
export function normalizeElement(element: Element): NormalizedNode;
export function producesGeometry(node: NormalizedNode): boolean;
export function createDescriptorKernel(): unknown;
export function evaluateNode(node: NormalizedNode, kernel?: unknown): unknown[];
export function createViewer(target?: { textContent?: string } | null): Viewer;

export class Viewer {
  constructor(target?: { textContent?: string } | null);
  render(result: EvaluationResult): this;
  clear(): this;
}

export class Runtime {
  configure(options?: { loader?: () => unknown }): this;
  load(): Promise<unknown>;
  schedule<T>(callback: () => T, options?: { macro?: boolean }): Promise<T>;
  evaluate(element: Element): Promise<EvaluationResult>;
  flush(element: Element): Promise<Element>;
  resetForTests(): this;
}

export const SolidarkRuntime: Runtime;
