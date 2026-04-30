import { ModelComponent } from './base/index.js'
import {
  CircleComponent,
  ConeComponent,
  CuboidComponent,
  CylinderComponent,
  PolygonComponent,
  PolylineComponent,
  RectangleComponent,
  SphereComponent,
  TorusComponent
} from './primitives/index.js'
import {
  MatrixComponent,
  MirrorComponent,
  PlaceComponent,
  RotateComponent,
  ScaleComponent,
  TranslateComponent,
  WorkplaneComponent
} from './transform/index.js'
import {
  DifferenceComponent,
  GroupComponent,
  IntersectionComponent,
  UnionComponent
} from './operation/index.js'
import {
  BrepComponent,
  ChamferComponent,
  CloseComponent,
  ExtrudeComponent,
  FaceComponent,
  FilletComponent,
  LineComponent,
  LoftComponent,
  MoveComponent,
  OffsetComponent,
  RevolveComponent,
  SectionComponent,
  ShellComponent,
  SketchComponent,
  StepComponent,
  StlComponent,
  SweepComponent
} from './feature/index.js'

export {
  BrepComponent,
  ChamferComponent,
  CircleComponent,
  CloseComponent,
  ConeComponent,
  CuboidComponent,
  CylinderComponent,
  DifferenceComponent,
  ExtrudeComponent,
  FaceComponent,
  FilletComponent,
  GroupComponent,
  IntersectionComponent,
  LineComponent,
  LoftComponent,
  MatrixComponent,
  MirrorComponent,
  ModelComponent,
  MoveComponent,
  OffsetComponent,
  PlaceComponent,
  PolygonComponent,
  PolylineComponent,
  RectangleComponent,
  RevolveComponent,
  RotateComponent,
  ScaleComponent,
  SectionComponent,
  ShellComponent,
  SketchComponent,
  SphereComponent,
  StepComponent,
  StlComponent,
  SweepComponent,
  TorusComponent,
  TranslateComponent,
  UnionComponent,
  WorkplaneComponent
}

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
 * @returns {readonly typeof import("./base/component.js").Component[]}
 */
export function defineSolidarkElements () {
  builtInElements.forEach((Element) => Element.define())
  return builtInElements
}
