import { Component } from './component.js'

function createElementClass (tag, category, geometryKind, defaultProperties = {}) {
  return class SolidarkElement extends Component {
    static tag = tag
    static category = category
    static geometryKind = geometryKind
    static defaultProperties = defaultProperties
  }
}

export const ModelComponent = createElementClass('sol-model', 'model', 'model')

export const CuboidComponent = createElementClass('sol-cuboid', 'primitive', 'solid')
export const SphereComponent = createElementClass('sol-sphere', 'primitive', 'solid')
export const CylinderComponent = createElementClass('sol-cylinder', 'primitive', 'solid')
export const ConeComponent = createElementClass('sol-cone', 'primitive', 'solid')
export const TorusComponent = createElementClass('sol-torus', 'primitive', 'solid')
export const CircleComponent = createElementClass('sol-circle', 'primitive', 'sketch')
export const RectangleComponent = createElementClass('sol-rectangle', 'primitive', 'sketch')
export const PolygonComponent = createElementClass('sol-polygon', 'primitive', 'sketch')
export const PolylineComponent = createElementClass('sol-polyline', 'primitive', 'sketch')

export const TranslateComponent = createElementClass('sol-translate', 'transform', 'shape')
export const RotateComponent = createElementClass('sol-rotate', 'transform', 'shape')
export const ScaleComponent = createElementClass('sol-scale', 'transform', 'shape')
export const MirrorComponent = createElementClass('sol-mirror', 'transform', 'shape')
export const MatrixComponent = createElementClass('sol-matrix', 'transform', 'shape')
export const PlaceComponent = createElementClass('sol-place', 'transform', 'shape')
export const WorkplaneComponent = createElementClass('sol-workplane', 'transform', 'shape')

export const UnionComponent = createElementClass('sol-union', 'operation', 'shape')
export const DifferenceComponent = createElementClass('sol-difference', 'operation', 'shape')
export const IntersectionComponent = createElementClass('sol-intersection', 'operation', 'shape')
export const GroupComponent = createElementClass('sol-group', 'operation', 'shape')

export const FilletComponent = createElementClass('sol-fillet', 'feature', 'solid')
export const ChamferComponent = createElementClass('sol-chamfer', 'feature', 'solid')
export const ShellComponent = createElementClass('sol-shell', 'feature', 'solid')
export const OffsetComponent = createElementClass('sol-offset', 'feature', 'shape')
export const ExtrudeComponent = createElementClass('sol-extrude', 'feature', 'solid')
export const RevolveComponent = createElementClass('sol-revolve', 'feature', 'solid')
export const SweepComponent = createElementClass('sol-sweep', 'feature', 'solid')
export const LoftComponent = createElementClass('sol-loft', 'feature', 'solid')
export const SectionComponent = createElementClass('sol-section', 'feature', 'sketch')
export const FaceComponent = createElementClass('sol-face', 'feature', 'surface')

export const SketchComponent = createElementClass('sol-sketch', 'component', 'sketch')
export const MoveComponent = createElementClass('sol-move', 'component', null)
export const LineComponent = createElementClass('sol-line', 'component', null)
export const CloseComponent = createElementClass('sol-close', 'component', null)

export const StepComponent = createElementClass('sol-step', 'external', 'assembly', {
  preserveHierarchy: true
})
export const StlComponent = createElementClass('sol-stl', 'external', 'mesh')
export const BrepComponent = createElementClass('sol-brep', 'external', 'shape')

export const builtInElements = Object.freeze([
  ModelComponent,
  CuboidComponent,
  SphereComponent,
  CylinderComponent,
  ConeComponent,
  TorusComponent,
  CircleComponent,
  RectangleComponent,
  PolygonComponent,
  PolylineComponent,
  TranslateComponent,
  RotateComponent,
  ScaleComponent,
  MirrorComponent,
  MatrixComponent,
  PlaceComponent,
  WorkplaneComponent,
  UnionComponent,
  DifferenceComponent,
  IntersectionComponent,
  GroupComponent,
  FilletComponent,
  ChamferComponent,
  ShellComponent,
  OffsetComponent,
  ExtrudeComponent,
  RevolveComponent,
  SweepComponent,
  LoftComponent,
  SectionComponent,
  FaceComponent,
  SketchComponent,
  MoveComponent,
  LineComponent,
  CloseComponent,
  StepComponent,
  StlComponent,
  BrepComponent
])

/**
 * Registers all built-in Solidark custom elements.
 *
 * @returns {readonly typeof Component[]}
 */
export function defineSolidarkElements () {
  builtInElements.forEach((Element) => Element.define())
  return builtInElements
}
