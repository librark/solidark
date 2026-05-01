import { parseVector } from '../../base/utils.js'
import { MemoryKernel } from '../../base/kernel/index.js'

/**
 * Loads OpenCascade.js using the stable v1 runtime entrypoint.
 *
 * @param {object} options
 * @param {(specifier: string) => Promise<{ initOpenCascade?: (options?: unknown) => unknown, default?: (options?: unknown) => unknown }>} options.importer
 * @param {unknown} options.initOptions
 * @returns {Promise<unknown>}
 */
export async function loadOpenCascade ({
  importer = importOpenCascadeModule,
  initOptions
} = {}) {
  const module = await importer('opencascade.js')
  const initOpenCascade = module.initOpenCascade || module.default

  if (typeof initOpenCascade !== 'function') {
    throw new TypeError('opencascade.js must export initOpenCascade or a default factory')
  }

  return initOpenCascade(initOptions)
}

/**
 * Creates the OpenCascade-backed kernel adapter boundary.
 *
 * The in-memory operations remain available while primitive and operation
 * translations are implemented incrementally against the loaded OCCT module.
 *
 * @param {object} options
 * @returns {Promise<OpencascadeKernel>}
 */
export async function createOpenCascadeKernel (options = {}) {
  const openCascade = await loadOpenCascade(options)

  return createOpenCascadeAdapter(openCascade)
}

/**
 * Creates an OpenCascade-backed kernel adapter from an already loaded module.
 *
 * @param {unknown} openCascade
 * @returns {OpencascadeKernel}
 */
export function createOpenCascadeAdapter (openCascade) {
  return new OpencascadeKernel(openCascade)
}

export class OpencascadeKernel extends MemoryKernel {
  constructor (openCascade) {
    super()
    this.name = 'opencascade'
    this.openCascade = openCascade
  }

  cuboid (properties = {}) {
    const openCascade = this.openCascade
    const [width, depth, height] = sizeFromProperties(properties)
    const result = makeBuilderShape(openCascade, ['BRepPrimAPI_MakeBox_1', 'BRepPrimAPI_MakeBox'], [width, depth, height])
    const centered = centeredFromProperties(properties)
    const placed = centered
      ? translateValue(openCascade, result.value, [-width / 2, -depth / 2, -height / 2], result.handles)
      : result

    return shape('primitive', 'sol-cuboid', properties, [], placed.value, placed.handles)
  }

  sphere (properties = {}) {
    return primitiveShape(
      this.openCascade,
      'sol-sphere',
      properties,
      ['BRepPrimAPI_MakeSphere_1', 'BRepPrimAPI_MakeSphere'],
      [radiusFromProperties(properties)]
    )
  }

  cylinder (properties = {}) {
    const openCascade = this.openCascade
    const radius = radiusFromProperties(properties)
    const height = numberFromProperties(properties, ['height', 'h'], 1)
    const result = makeBuilderShape(openCascade, ['BRepPrimAPI_MakeCylinder_1', 'BRepPrimAPI_MakeCylinder'], [radius, height])
    const centered = centeredFromProperties(properties)
    const placed = centered
      ? translateValue(openCascade, result.value, [0, 0, -height / 2], result.handles)
      : result

    return shape('primitive', 'sol-cylinder', properties, [], placed.value, placed.handles)
  }

  cone (properties = {}) {
    const openCascade = this.openCascade
    const radius1 = numberFromProperties(properties, ['radius1', 'r1', 'bottomRadius', 'radius', 'r'], 1)
    const radius2 = numberFromProperties(properties, ['radius2', 'r2', 'topRadius'], 0)
    const height = numberFromProperties(properties, ['height', 'h'], 1)
    const result = makeBuilderShape(openCascade, ['BRepPrimAPI_MakeCone_1', 'BRepPrimAPI_MakeCone'], [radius1, radius2, height])
    const centered = centeredFromProperties(properties)
    const placed = centered
      ? translateValue(openCascade, result.value, [0, 0, -height / 2], result.handles)
      : result

    return shape('primitive', 'sol-cone', properties, [], placed.value, placed.handles)
  }

  torus (properties = {}) {
    return primitiveShape(
      this.openCascade,
      'sol-torus',
      properties,
      ['BRepPrimAPI_MakeTorus_1', 'BRepPrimAPI_MakeTorus'],
      [
        numberFromProperties(properties, ['majorRadius', 'radius1', 'r1', 'major'], 1),
        numberFromProperties(properties, ['minorRadius', 'radius2', 'r2', 'minor', 'tubeRadius'], 0.25)
      ]
    )
  }

  circle (properties = {}) {
    const result = makeCircleWire(this.openCascade, properties)

    return shape('sketch', 'sol-circle', properties, [], result.value, result.handles)
  }

  ellipse (properties = {}) {
    const result = makeEllipseWire(this.openCascade, properties)

    return shape('sketch', 'sol-ellipse', properties, [], result.value, result.handles)
  }

  rectangle (properties = {}) {
    const result = makeRectangleWire(this.openCascade, properties)

    return shape('sketch', 'sol-rectangle', properties, [], result.value, result.handles)
  }

  polygon (properties = {}) {
    const result = makePolygonWire(this.openCascade, properties)

    return shape('sketch', 'sol-polygon', properties, [], result.value, result.handles)
  }

  polyline (properties = {}) {
    const result = makePolylineWire(this.openCascade, properties)

    return shape('sketch', 'sol-polyline', properties, [], result.value, result.handles)
  }

  translate (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? translateValue(openCascade, combined.value, vectorFromProperties(properties), combined.handles)
      : combined

    return shape('transform', 'sol-translate', properties, children, placed.value, placed.handles)
  }

  rotate (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? rotateValue(openCascade, combined.value, vectorFromProperties(properties), combined.handles)
      : combined

    return shape('transform', 'sol-rotate', properties, children, placed.value, placed.handles)
  }

  scale (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? scaleValue(openCascade, combined.value, properties, combined.handles)
      : combined

    return shape('transform', 'sol-scale', properties, children, placed.value, placed.handles)
  }

  mirror (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? mirrorValue(openCascade, combined.value, properties, combined.handles)
      : combined

    return shape('transform', 'sol-mirror', properties, children, placed.value, placed.handles)
  }

  matrix (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? matrixValue(openCascade, combined.value, matrixValuesFromProperties(properties), combined.handles)
      : combined

    return shape('transform', 'sol-matrix', properties, children, placed.value, placed.handles)
  }

  place (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? matrixValue(openCascade, combined.value, placementValuesFromProperties(properties), combined.handles)
      : combined

    return shape('transform', 'sol-place', properties, children, placed.value, placed.handles)
  }

  workplane (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? matrixValue(openCascade, combined.value, placementValuesFromProperties({ direction: properties.normal, ...properties }), combined.handles)
      : combined

    return shape('transform', 'sol-workplane', properties, children, placed.value, placed.handles)
  }

  union (properties = {}, children = []) {
    const result = combineBoolean(this.openCascade, ['BRepAlgoAPI_Fuse_3', 'BRepAlgoAPI_Fuse'], children)

    return shape('operation', 'sol-union', properties, children, result.value, result.handles)
  }

  difference (properties = {}, children = []) {
    const result = combineBoolean(this.openCascade, ['BRepAlgoAPI_Cut_3', 'BRepAlgoAPI_Cut'], children)

    return shape('operation', 'sol-difference', properties, children, result.value, result.handles)
  }

  intersection (properties = {}, children = []) {
    const result = combineBoolean(this.openCascade, ['BRepAlgoAPI_Common_3', 'BRepAlgoAPI_Common'], children)

    return shape('operation', 'sol-intersection', properties, children, result.value, result.handles)
  }

  group (properties = {}, children = []) {
    const result = combineChildren(this.openCascade, children)

    return shape('operation', 'sol-group', properties, children, result.value, result.handles)
  }

  fillet (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const result = combined.value
      ? makeEdgeFeatureShape(openCascade, 'fillet', properties, combined.value, combined.handles)
      : combined

    return shape('feature', 'sol-fillet', properties, children, result.value, result.handles)
  }

  chamfer (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const result = combined.value
      ? makeEdgeFeatureShape(openCascade, 'chamfer', properties, combined.value, combined.handles)
      : combined

    return shape('feature', 'sol-chamfer', properties, children, result.value, result.handles)
  }

  shell (properties = {}, children = []) {
    const result = makeShellShape(this.openCascade, properties, children)

    return shape('feature', 'sol-shell', properties, children, result.value, result.handles)
  }

  offset (properties = {}, children = []) {
    const result = makeOffsetShape(this.openCascade, properties, children)

    return shape('feature', 'sol-offset', properties, children, result.value, result.handles)
  }

  extrude (properties = {}, children = []) {
    const result = makeExtrudedShape(this.openCascade, properties, children)

    return shape('feature', 'sol-extrude', properties, children, result.value, result.handles)
  }

  revolve (properties = {}, children = []) {
    const result = makeRevolvedShape(this.openCascade, properties, children)

    return shape('feature', 'sol-revolve', properties, children, result.value, result.handles)
  }

  sweep (properties = {}, children = []) {
    const result = makeSweepShape(this.openCascade, properties, children)

    return shape('feature', 'sol-sweep', properties, children, result.value, result.handles)
  }

  loft (properties = {}, children = []) {
    const result = makeLoftShape(this.openCascade, properties, children)

    return shape('feature', 'sol-loft', properties, children, result.value, result.handles)
  }

  section (properties = {}, children = []) {
    const result = makeSectionShape(this.openCascade, properties, children)

    return shape('feature', 'sol-section', properties, children, result.value, result.handles)
  }

  face (properties = {}, children = []) {
    const result = makeFaceShape(this.openCascade, properties, children)

    return shape('feature', 'sol-face', properties, children, result.value, result.handles)
  }

  sketch (properties = {}, children = []) {
    const result = makeSketchWire(this.openCascade, children)

    return shape('sketch', 'sol-sketch', properties, children, result.value, result.handles)
  }

  move (properties = {}) {
    return sketchAction('sol-move', 'move', properties)
  }

  line (properties = {}) {
    return sketchAction('sol-line', 'line', properties)
  }

  arc (properties = {}) {
    return sketchAction('sol-arc', 'arc', properties)
  }

  close (properties = {}) {
    return sketchAction('sol-close', 'close', properties)
  }

  step (properties = {}, children = []) {
    const result = importStepShape(this.openCascade, properties)

    return shape('external', 'sol-step', properties, children, result.value, result.handles)
  }

  stl (properties = {}, children = []) {
    const result = importStlShape(this.openCascade, properties)

    return shape('external', 'sol-stl', properties, children, result.value, result.handles)
  }

  brep (properties = {}, children = []) {
    const result = importBrepShape(this.openCascade, properties)

    return shape('external', 'sol-brep', properties, children, result.value, result.handles)
  }

  toMesh (entry, options = {}) {
    return meshEntry(this.openCascade, entry, options)
  }

  dispose (entry) {
    disposeShape(entry)
  }
}

/**
 * Creates an OpenCascade binding instance.
 *
 * @param {Record<string, unknown>} openCascade
 * @param {string[]} names
 * @param {unknown[]} args
 * @returns {unknown}
 */
export function constructOpenCascadeBinding (openCascade, names, args = []) {
  for (const name of names) {
    const Binding = openCascade[name]

    if (typeof Binding === 'function') {
      return new Binding(...args)
    }
  }

  throw new TypeError(`OpenCascade binding not found: ${names.join(', ')}`)
}

function constructOptionalOpenCascadeBinding (openCascade, names, args = []) {
  for (const name of names) {
    const Binding = openCascade[name]

    if (typeof Binding === 'function') {
      return new Binding(...args)
    }
  }

  return null
}

function primitiveShape (openCascade, tag, properties, names, args) {
  const result = makeBuilderShape(openCascade, names, args)

  return shape('primitive', tag, properties, [], result.value, result.handles)
}

function makeBuilderShape (openCascade, names, args) {
  const builder = constructOpenCascadeBinding(openCascade, names, args)

  return {
    value: extractShape(builder),
    handles: [builder]
  }
}

function extractShape (builder) {
  if (builder && typeof builder.Shape === 'function') {
    return builder.Shape()
  }

  return builder
}

function combineChildren (openCascade, children) {
  return combineBoolean(openCascade, ['BRepAlgoAPI_Fuse_3', 'BRepAlgoAPI_Fuse'], children)
}

function combineBoolean (openCascade, names, children) {
  const values = children.map(shapeValue).filter(Boolean)

  if (values.length === 0) {
    return { value: null, handles: [] }
  }

  if (values.length === 1) {
    return { value: values[0], handles: [] }
  }

  return values.slice(1).reduce((result, next) => {
    const step = makeBooleanShape(openCascade, names, result.value, next)

    return {
      value: step.value,
      handles: [...result.handles, ...step.handles]
    }
  }, { value: values[0], handles: [] })
}

function makeBooleanShape (openCascade, names, left, right) {
  let progress = constructOptionalOpenCascadeBinding(openCascade, ['Message_ProgressRange_1', 'Message_ProgressRange'], [])
  let result

  if (progress) {
    try {
      result = makeBuilderShape(openCascade, names, [left, right, progress])
    } catch (error) {
      if (!isBindingArgumentCountError(error)) {
        throw error
      }

      disposeTemporaryHandles([progress])
      progress = null
    }
  }

  if (!result) {
    result = makeBuilderShape(openCascade, names, [left, right])
  }

  return {
    value: result.value,
    handles: progress ? [left, progress, ...result.handles] : [left, ...result.handles]
  }
}

function translateValue (openCascade, value, vector, handles = []) {
  const transform = constructOpenCascadeBinding(openCascade, ['gp_Trsf_1', 'gp_Trsf'], [])
  const offset = constructOpenCascadeBinding(openCascade, ['gp_Vec_4', 'gp_Vec'], vector)

  setTranslation(transform, offset)

  const result = makeBuilderShape(
    openCascade,
    ['BRepBuilderAPI_Transform_2', 'BRepBuilderAPI_Transform'],
    [value, transform, true]
  )

  return {
    value: result.value,
    handles: [...handles, value, offset, transform, ...result.handles]
  }
}

function setTranslation (transform, offset) {
  if (typeof transform.SetTranslation_1 === 'function') {
    transform.SetTranslation_1(offset)
    return
  }

  if (typeof transform.SetTranslationPart === 'function') {
    transform.SetTranslationPart(offset)
    return
  }

  throw new TypeError('OpenCascade gp_Trsf does not support translation')
}

function transformValue (openCascade, value, transform, handles = []) {
  const result = makeBuilderShape(
    openCascade,
    ['BRepBuilderAPI_Transform_2', 'BRepBuilderAPI_Transform'],
    [value, transform, true]
  )

  return {
    value: result.value,
    handles: [...handles, value, transform, ...result.handles]
  }
}

function rotateValue (openCascade, value, vector, handles = []) {
  return [
    [[1, 0, 0], vector[0]],
    [[0, 1, 0], vector[1]],
    [[0, 0, 1], vector[2]]
  ].reduce((result, [axis, degrees]) => {
    if (!degrees) {
      return result
    }

    return rotateAxisValue(openCascade, result.value, axis, degrees, result.handles)
  }, { value, handles })
}

function rotateAxisValue (openCascade, value, axis, degrees, handles = []) {
  const transform = constructOpenCascadeBinding(openCascade, ['gp_Trsf_1', 'gp_Trsf'], [])
  const origin = constructOpenCascadeBinding(openCascade, ['gp_Pnt_3', 'gp_Pnt'], [0, 0, 0])
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], axis)
  const rotationAxis = constructOpenCascadeBinding(openCascade, ['gp_Ax1_2', 'gp_Ax1'], [origin, direction])

  setRotation(transform, rotationAxis, degreesToRadians(degrees))

  const result = makeBuilderShape(
    openCascade,
    ['BRepBuilderAPI_Transform_2', 'BRepBuilderAPI_Transform'],
    [value, transform, true]
  )

  return {
    value: result.value,
    handles: [...handles, value, origin, direction, rotationAxis, transform, ...result.handles]
  }
}

function setRotation (transform, axis, radians) {
  if (typeof transform.SetRotation_1 === 'function') {
    transform.SetRotation_1(axis, radians)
    return
  }

  if (typeof transform.SetRotation === 'function') {
    transform.SetRotation(axis, radians)
    return
  }

  throw new TypeError('OpenCascade gp_Trsf does not support rotation')
}

function scaleValue (openCascade, value, properties, handles = []) {
  const vector = scaleVectorFromProperties(properties)
  const origin = pointFromCoordinates(openCascade, originFromProperties(properties))
  const transform = constructOpenCascadeBinding(openCascade, ['gp_Trsf_1', 'gp_Trsf'], [])

  if (sameScalar(vector)) {
    setScale(transform, origin, vector[0])
    return transformValue(openCascade, value, transform, [...handles, origin])
  }

  setTransformValues(transform, scaleMatrixValues(vector, origin.coordinates || origin.args || originFromProperties(properties)))
  return transformValue(openCascade, value, transform, [...handles, origin])
}

function setScale (transform, origin, factor) {
  if (typeof transform.SetScale === 'function') {
    transform.SetScale(origin, factor)
    return
  }

  throw new TypeError('OpenCascade gp_Trsf does not support scale')
}

function mirrorValue (openCascade, value, properties, handles = []) {
  const transform = constructOpenCascadeBinding(openCascade, ['gp_Trsf_1', 'gp_Trsf'], [])
  const origin = pointFromCoordinates(openCascade, originFromProperties(properties))
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], mirrorNormalFromProperties(properties))
  const plane = constructOpenCascadeBinding(openCascade, ['gp_Ax2_3', 'gp_Ax2'], [origin, direction])

  setMirrorPlane(transform, plane)
  return transformValue(openCascade, value, transform, [...handles, origin, direction, plane])
}

function setMirrorPlane (transform, plane) {
  if (typeof transform.SetMirror_3 === 'function') {
    transform.SetMirror_3(plane)
    return
  }

  if (typeof transform.SetMirror === 'function') {
    transform.SetMirror(plane)
    return
  }

  throw new TypeError('OpenCascade gp_Trsf does not support plane mirror')
}

function matrixValue (openCascade, value, values, handles = []) {
  const transform = constructOpenCascadeBinding(openCascade, ['gp_Trsf_1', 'gp_Trsf'], [])

  setTransformValues(transform, values)
  return transformValue(openCascade, value, transform, handles)
}

function setTransformValues (transform, values) {
  if (typeof transform.SetValues === 'function') {
    transform.SetValues(...values)
    return
  }

  throw new TypeError('OpenCascade gp_Trsf does not support matrix values')
}

function makeSketchWire (openCascade, children) {
  return makeWireFromSketchEntries(openCascade, sketchEntries(children))
}

function makeCircleWire (openCascade, properties) {
  const radius = radiusFromProperties(properties)

  if (!hasSegmentApproximation(properties)) {
    return makeWireFromEdges(openCascade, [makeCircleEdge(openCascade, radius)])
  }

  const segments = Math.max(3, Math.floor(numberFromProperties(properties, ['segments', 'fn', '$fn'], 64)))
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = index / segments * Math.PI * 2

    return [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    ]
  })

  return makeWireFromPoints(openCascade, points, true)
}

function hasSegmentApproximation (properties) {
  return properties.segments !== undefined || properties.fn !== undefined || properties.$fn !== undefined
}

function makeCircleEdge (openCascade, radius) {
  const origin = pointFromCoordinates(openCascade, [0, 0, 0])
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], [0, 0, 1])
  const axis = constructOpenCascadeBinding(openCascade, ['gp_Ax2_3', 'gp_Ax2'], [origin, direction])
  const circle = constructOpenCascadeBinding(openCascade, ['gp_Circ_2', 'gp_Circ'], [axis, radius])
  const builder = constructOpenCascadeBinding(
    openCascade,
    [
      'BRepBuilderAPI_MakeEdge_8',
      'BRepBuilderAPI_MakeEdge'
    ],
    [circle]
  )

  return {
    value: extractEdge(builder),
    handles: [origin, direction, axis, circle, builder]
  }
}

function makeEllipseWire (openCascade, properties) {
  const [radiusX, radiusY] = ellipseRadiiFromProperties(properties)
  const xDirectionCoordinates = radiusX >= radiusY ? [1, 0, 0] : [0, 1, 0]
  const origin = pointFromCoordinates(openCascade, [0, 0, 0])
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], [0, 0, 1])
  const xDirection = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], xDirectionCoordinates)
  const axis = constructOpenCascadeBindingWithArguments(
    openCascade,
    ['gp_Ax2_4', 'gp_Ax2_3', 'gp_Ax2'],
    [
      [origin, direction, xDirection],
      [origin, direction]
    ]
  )
  const ellipse = constructOpenCascadeBinding(openCascade, ['gp_Elips_2', 'gp_Elips'], [axis, Math.max(radiusX, radiusY), Math.min(radiusX, radiusY)])
  const builder = constructOpenCascadeBinding(
    openCascade,
    [
      'BRepBuilderAPI_MakeEdge_12',
      'BRepBuilderAPI_MakeEdge'
    ],
    [ellipse]
  )

  return makeWireFromEdges(openCascade, [{
    value: extractEdge(builder),
    handles: [origin, direction, xDirection, axis, ellipse, builder]
  }])
}

function makeRectangleWire (openCascade, properties) {
  const [width, height] = sizeFromProperties(properties)
  const points = centeredFromProperties(properties)
    ? [
        [-width / 2, -height / 2, 0],
        [width / 2, -height / 2, 0],
        [width / 2, height / 2, 0],
        [-width / 2, height / 2, 0]
      ]
    : [
        [0, 0, 0],
        [width, 0, 0],
        [width, height, 0],
        [0, height, 0]
      ]

  return makeWireFromPoints(openCascade, points, true)
}

function makePolygonWire (openCascade, properties) {
  return makeWireFromPoints(openCascade, pointsFromProperties(properties), true)
}

function makePolylineWire (openCascade, properties) {
  return makeWireFromPoints(openCascade, pointsFromProperties(properties), booleanFromProperties(properties, ['closed', 'close'], false))
}

function makeWireFromPoints (openCascade, points, closed) {
  const normalized = points.map((point) => padVector(point, 3))

  if (normalized.length < 2) {
    return { value: null, handles: [] }
  }

  const segments = []

  for (let index = 1; index < normalized.length; index += 1) {
    segments.push([normalized[index - 1], normalized[index]])
  }

  if (closed && !samePoint(normalized[0], normalized[normalized.length - 1])) {
    segments.push([normalized[normalized.length - 1], normalized[0]])
  }

  return makeWireFromSegments(openCascade, segments)
}

function makeWireFromSegments (openCascade, segments) {
  return makeWireFromEdges(openCascade, segments.map(([from, to]) => makeSketchEdge(openCascade, from, to)))
}

function makeWireFromSketchEntries (openCascade, entries) {
  if (entries.length === 0) {
    return { value: null, handles: [] }
  }

  return makeWireFromEdges(openCascade, entries.map((entry) => {
    return entry.kind === 'arc'
      ? makeArcEdge(openCascade, entry.from, entry.through, entry.to)
      : makeSketchEdge(openCascade, entry.from, entry.to)
  }))
}

function makeWireFromEdges (openCascade, edges) {
  const wireBuilder = constructOpenCascadeBinding(
    openCascade,
    ['BRepBuilderAPI_MakeWire_1', 'BRepBuilderAPI_MakeWire'],
    []
  )
  const handles = [wireBuilder]

  for (const edge of edges) {
    handles.push(...edge.handles)
    addWireEdge(wireBuilder, edge.value)
  }

  return {
    value: extractWire(wireBuilder),
    handles
  }
}

function sketchEntries (children) {
  let start = null
  let current = null
  const entries = []

  for (const child of children) {
    if (!child || child.category !== 'sketch') {
      continue
    }

    if (child.action === 'move') {
      current = child.point
      start = start || current
    }

    if (child.action === 'line' && current) {
      entries.push({ kind: 'line', from: current, to: child.point })
      current = child.point
    }

    if (child.action === 'arc' && current) {
      if (!child.through) {
        throw new Error('sol-arc requires a through point')
      }

      entries.push({ kind: 'arc', from: current, through: child.through, to: child.point })
      current = child.point
    }

    if (child.action === 'close' && start && current && !samePoint(start, current)) {
      entries.push({ kind: 'line', from: current, to: start })
      current = start
    }
  }

  return entries
}

function makeSketchEdge (openCascade, from, to) {
  const start = pointFromCoordinates(openCascade, from)
  const end = pointFromCoordinates(openCascade, to)
  const builder = constructOpenCascadeBinding(
    openCascade,
    [
      'BRepBuilderAPI_MakeEdge_3',
      'BRepBuilderAPI_MakeEdge_2',
      'BRepBuilderAPI_MakeEdge_1',
      'BRepBuilderAPI_MakeEdge'
    ],
    [start, end]
  )

  return {
    value: extractEdge(builder),
    handles: [start, end, builder]
  }
}

function makeArcEdge (openCascade, from, through, to) {
  const circleCoordinates = circleFromThreePoints(from, through, to)
  const origin = pointFromCoordinates(openCascade, circleCoordinates.origin)
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], [0, 0, 1])
  const axis = constructOpenCascadeBinding(openCascade, ['gp_Ax2_3', 'gp_Ax2'], [origin, direction])
  const circle = constructOpenCascadeBinding(openCascade, ['gp_Circ_2', 'gp_Circ'], [axis, circleCoordinates.radius])
  const builder = constructOpenCascadeBinding(
    openCascade,
    [
      'BRepBuilderAPI_MakeEdge_9',
      'BRepBuilderAPI_MakeEdge'
    ],
    [circle, circleCoordinates.startAngle, circleCoordinates.endAngle]
  )

  return {
    value: extractEdge(builder),
    handles: [origin, direction, axis, circle, builder]
  }
}

function pointFromCoordinates (openCascade, coordinates) {
  return constructOpenCascadeBinding(openCascade, ['gp_Pnt_3', 'gp_Pnt'], coordinates)
}

function addWireEdge (wireBuilder, edge) {
  if (typeof wireBuilder.Add_1 === 'function') {
    wireBuilder.Add_1(edge)
    return
  }

  if (typeof wireBuilder.Add === 'function') {
    wireBuilder.Add(edge)
    return
  }

  throw new TypeError('OpenCascade BRepBuilderAPI_MakeWire does not support Add')
}

function extractEdge (builder) {
  if (builder && typeof builder.Edge === 'function') {
    return builder.Edge()
  }

  return extractShape(builder)
}

function extractWire (builder) {
  if (builder && typeof builder.Wire === 'function') {
    return builder.Wire()
  }

  return extractShape(builder)
}

function makeLoftShape (openCascade, properties, children) {
  const wires = children.map(shapeValue).filter(Boolean)

  if (wires.length < 2) {
    throw new TypeError('sol-loft requires at least two profile children')
  }

  const builder = makeLoftBuilder(openCascade, properties)
  const handles = [builder]

  for (const wire of wires) {
    const section = wireFromShape(openCascade, wire)
    handles.push(section)
    addLoftWire(builder, section)
  }

  buildLoft(builder, openCascade, handles)

  return {
    value: extractShape(builder),
    handles
  }
}

function makeLoftBuilder (openCascade, properties) {
  return constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepOffsetAPI_ThruSections_1', 'BRepOffsetAPI_ThruSections'],
    [
      [booleanFromProperties(properties, ['solid'], true), booleanFromProperties(properties, ['ruled'], false), numberFromProperties(properties, ['tolerance', 'precision'], 1e-6)],
      [booleanFromProperties(properties, ['solid'], true), booleanFromProperties(properties, ['ruled'], false)],
      []
    ]
  )
}

function constructOpenCascadeBindingWithArguments (openCascade, names, argumentSets) {
  let argumentError = new TypeError(`OpenCascade binding not found: ${names.join(', ')}`)

  for (const args of argumentSets) {
    try {
      return constructOpenCascadeBinding(openCascade, names, args)
    } catch (error) {
      if (!isBindingArgumentCountError(error)) {
        throw error
      }

      argumentError = error
    }
  }

  throw argumentError
}

function addLoftWire (builder, wire) {
  if (typeof builder.AddWire === 'function') {
    builder.AddWire(wire)
    return
  }

  if (typeof builder.AddWire_1 === 'function') {
    builder.AddWire_1(wire)
    return
  }

  throw new TypeError('OpenCascade BRepOffsetAPI_ThruSections does not support AddWire')
}

function wireFromShape (openCascade, value) {
  if (openCascade.TopoDS && typeof openCascade.TopoDS.Wire_1 === 'function') {
    return openCascade.TopoDS.Wire_1(value)
  }

  return value
}

function makeFaceShape (openCascade, properties, children) {
  const value = firstShapeValue(children)

  if (!value) {
    throw new TypeError('sol-face requires one profile child')
  }

  return makeFaceFromValue(openCascade, value, [], properties)
}

function makeFaceFromValue (openCascade, value, handles = [], properties = {}) {
  const featureHandles = []

  try {
    const wire = wireFromShape(openCascade, value)

    if (wire !== value) {
      featureHandles.push(wire)
    }

    const builder = constructOpenCascadeBindingWithArguments(
      openCascade,
      [
        'BRepBuilderAPI_MakeFace_15',
        'BRepBuilderAPI_MakeFace_14',
        'BRepBuilderAPI_MakeFace',
        'BRepBuilderAPI_MakeFace_13'
      ],
      [
        [wire, booleanFromProperties(properties, ['inside', 'bound'], true)],
        [wire]
      ]
    )

    featureHandles.push(builder)

    return {
      value: extractFace(builder),
      handles: [...handles, ...featureHandles]
    }
  } catch (error) {
    disposeTemporaryHandles(featureHandles)
    throw error
  }
}

function extractFace (builder) {
  if (builder && typeof builder.Face === 'function') {
    return builder.Face()
  }

  return extractShape(builder)
}

function makeExtrudedShape (openCascade, properties, children) {
  const profile = makeProfileShape(openCascade, properties, children, 'sol-extrude')

  const vector = constructOpenCascadeBinding(openCascade, ['gp_Vec_4', 'gp_Vec'], extrusionVectorFromProperties(properties))
  const builder = constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepPrimAPI_MakePrism_1', 'BRepPrimAPI_MakePrism_2', 'BRepPrimAPI_MakePrism'],
    [
      [profile.value, vector, booleanFromProperties(properties, ['copy'], false), booleanFromProperties(properties, ['canonize'], true)],
      [profile.value, vector]
    ]
  )
  const result = {
    value: extractShape(builder),
    handles: [...profile.handles, profile.value, vector, builder]
  }

  return centeredFromProperties(properties)
    ? translateValue(openCascade, result.value, extrusionVectorFromProperties(properties).map((entry) => -entry / 2), result.handles)
    : result
}

function makeRevolvedShape (openCascade, properties, children) {
  const profile = makeProfileShape(openCascade, properties, children, 'sol-revolve')

  const axis = axisFromProperties(openCascade, properties)
  const angle = degreesToRadians(numberFromProperties(properties, ['angle', 'degrees'], 360))
  const builder = constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepPrimAPI_MakeRevol_1', 'BRepPrimAPI_MakeRevol_2', 'BRepPrimAPI_MakeRevol'],
    [
      [profile.value, axis.value, angle, booleanFromProperties(properties, ['copy'], false)],
      [profile.value, axis.value, angle],
      [profile.value, axis.value]
    ]
  )

  return {
    value: extractShape(builder),
    handles: [...profile.handles, profile.value, ...axis.handles, builder]
  }
}

function makeSweepShape (openCascade, properties, children) {
  const values = children.map(shapeValue).filter(Boolean)

  if (values.length < 2) {
    throw new TypeError('sol-sweep requires a profile child and a path child')
  }

  const pathIndex = sweepPathIndex(properties, values)
  const path = values[pathIndex]

  if (!path) {
    throw new TypeError(`sol-sweep path index ${pathIndex} does not match a child shape`)
  }

  const profileIndex = values.findIndex((value, index) => index !== pathIndex && value)
  const profileValue = values[profileIndex]
  const profile = makeProfileValue(openCascade, profileValue, children[profileIndex], properties)
  const spine = wireFromShape(openCascade, path)
  const handles = [...profile.handles]

  if (spine !== path) {
    handles.push(spine)
  }

  const builder = constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepOffsetAPI_MakePipe_1', 'BRepOffsetAPI_MakePipe_2', 'BRepOffsetAPI_MakePipe'],
    [[spine, profile.value]]
  )

  return {
    value: extractShape(builder),
    handles: [...handles, path, profile.value, builder]
  }
}

function sweepPathIndex (properties, values) {
  const path = properties.path ?? properties.spine

  if (path === 'first' || path === 0) {
    return 0
  }

  if (path === 'last' || path === undefined) {
    return values.length - 1
  }

  return Number(path)
}

function makeOffsetShape (openCascade, properties, children) {
  const combined = combineChildren(openCascade, children)

  if (!combined.value) {
    return combined
  }

  const builder = constructOpenCascadeBinding(
    openCascade,
    ['BRepOffsetAPI_MakeOffsetShape_1', 'BRepOffsetAPI_MakeOffsetShape'],
    []
  )

  builder.PerformByJoin(
    combined.value,
    numberFromProperties(properties, ['distance', 'd', 'offset'], 1),
    numberFromProperties(properties, ['tolerance', 'precision'], 1e-3),
    offsetMode(openCascade, properties),
    booleanFromProperties(properties, ['intersection'], false),
    booleanFromProperties(properties, ['selfIntersection', 'selfInter'], false),
    joinType(openCascade, properties),
    booleanFromProperties(properties, ['removeInternalEdges'], false)
  )

  return {
    value: extractShape(builder),
    handles: [...combined.handles, combined.value, builder]
  }
}

function makeShellShape (openCascade, properties, children) {
  const combined = combineChildren(openCascade, children)

  if (!combined.value) {
    return combined
  }

  const faceResult = collectSelectedFaces(openCascade, combined.value, properties)
  const facesToRemove = shapeListFromValues(openCascade, faceResult.faces)
  const builder = constructOpenCascadeBinding(
    openCascade,
    ['BRepOffsetAPI_MakeThickSolid_1', 'BRepOffsetAPI_MakeThickSolid'],
    []
  )

  builder.MakeThickSolidByJoin(
    combined.value,
    facesToRemove.value,
    numberFromProperties(properties, ['thickness', 'distance', 'd'], 1),
    numberFromProperties(properties, ['tolerance', 'precision'], 1e-3),
    offsetMode(openCascade, properties),
    booleanFromProperties(properties, ['intersection'], false),
    booleanFromProperties(properties, ['selfIntersection', 'selfInter'], false),
    joinType(openCascade, properties),
    booleanFromProperties(properties, ['removeInternalEdges'], false)
  )

  return {
    value: extractShape(builder),
    handles: [
      ...combined.handles,
      combined.value,
      ...faceResult.handles,
      ...facesToRemove.handles,
      facesToRemove.value,
      builder
    ]
  }
}

function makeSectionShape (openCascade, properties, children) {
  const combined = combineChildren(openCascade, children)

  if (!combined.value) {
    return combined
  }

  const plane = planeFromProperties(openCascade, properties)
  const builder = constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepAlgoAPI_Section_5', 'BRepAlgoAPI_Section_6', 'BRepAlgoAPI_Section'],
    [
      [combined.value, plane.value, booleanFromProperties(properties, ['performNow', 'perform'], false)]
    ]
  )

  if (typeof builder.Build === 'function') {
    builder.Build()
  }

  return {
    value: extractShape(builder),
    handles: [...combined.handles, combined.value, ...plane.handles, plane.value, builder]
  }
}

function makeProfileShape (openCascade, properties, children, featureName = 'profile feature') {
  const value = firstShapeValue(children)

  if (!value) {
    throw new TypeError(`${featureName} requires one profile child`)
  }

  return makeProfileValue(openCascade, value, children.find((child) => shapeValue(child) === value), properties)
}

function makeProfileValue (openCascade, value, child, properties = {}) {
  if (shouldFaceProfile(child, properties)) {
    return makeFaceFromValue(openCascade, value, [], properties)
  }

  if (booleanFromProperties(properties, ['face'], true)) {
    try {
      return makeFaceFromValue(openCascade, value, [], properties)
    } catch (error) {
      if (booleanFromProperties(properties, ['strict'], false)) {
        throw error
      }
    }
  }

  return { value, handles: [] }
}

function shouldFaceProfile (child, properties) {
  if (properties.face === false) {
    return false
  }

  return child?.category === 'sketch' || child?.tag === 'sol-sketch'
}

function firstShapeValue (children) {
  return children.map(shapeValue).find(Boolean) || null
}

function makeEdgeFeatureShape (openCascade, type, properties, value, handles = []) {
  const featureHandles = []

  try {
    const edgeResult = collectShapeEdges(openCascade, value)
    featureHandles.push(...edgeResult.handles)

    const edges = selectShapeEdges(edgeResult.edges, properties)

    if (edges.length === 0) {
      disposeTemporaryHandles(featureHandles)
      return { value, handles }
    }

    const builder = type === 'fillet'
      ? makeFilletBuilder(openCascade, value, properties)
      : makeChamferBuilder(openCascade, value)

    featureHandles.push(builder)

    for (const edge of edges) {
      addFeatureEdge(builder, type, properties, edge)
    }

    builder.Build()

    return {
      value: extractShape(builder),
      handles: [...handles, value, ...featureHandles]
    }
  } catch (error) {
    disposeTemporaryHandles(featureHandles)

    if (booleanFromProperties(properties, ['strict'], false)) {
      throw error
    }

    return { value, handles }
  }
}

function makeFilletBuilder (openCascade, value, properties) {
  return constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepFilletAPI_MakeFillet_1', 'BRepFilletAPI_MakeFillet'],
    [
      [value, numberFromProperties(properties, ['shape', 'filletShape'], 0)],
      [value]
    ]
  )
}

function makeChamferBuilder (openCascade, value) {
  return constructOpenCascadeBindingWithArguments(
    openCascade,
    ['BRepFilletAPI_MakeChamfer_1', 'BRepFilletAPI_MakeChamfer'],
    [[value]]
  )
}

function collectShapeEdges (openCascade, value) {
  const explorer = constructOpenCascadeBinding(
    openCascade,
    ['TopExp_Explorer_2', 'TopExp_Explorer'],
    [
      value,
      topAbsShapeEnum(openCascade, 'TopAbs_EDGE'),
      topAbsShapeEnum(openCascade, 'TopAbs_SHAPE')
    ]
  )
  const edges = []
  const handles = [explorer]

  while (explorer.More()) {
    const current = explorer.Current()
    const edge = edgeFromShape(openCascade, current)

    handles.push(current, edge)
    edges.push(edge)
    explorer.Next()
  }

  return { edges, handles }
}

function edgeFromShape (openCascade, current) {
  if (openCascade.TopoDS && typeof openCascade.TopoDS.Edge_1 === 'function') {
    return openCascade.TopoDS.Edge_1(current)
  }

  return current
}

function selectShapeEdges (edges, properties) {
  const indexes = selectedEdgeIndexes(properties)

  if (!indexes) {
    return edges
  }

  return edges.filter((edge, index) => indexes.has(index))
}

function selectedEdgeIndexes (properties) {
  const selection = properties.edges ?? properties.edge ?? properties.select

  if (selection === undefined || selection === true || selection === 'all') {
    return null
  }

  if (selection === false || selection === 'none') {
    return new Set()
  }

  return new Set(parseVector(selection).map(Number))
}

function addFeatureEdge (builder, type, properties, edge) {
  if (type === 'fillet') {
    addFilletEdge(builder, numberFromProperties(properties, ['radius', 'r'], 1), edge)
    return
  }

  addChamferEdge(builder, numberFromProperties(properties, ['distance', 'd', 'radius', 'r'], 1), edge)
}

function addFilletEdge (builder, radius, edge) {
  if (typeof builder.Add_2 === 'function') {
    builder.Add_2(radius, edge)
    return
  }

  if (typeof builder.Add === 'function') {
    builder.Add(radius, edge)
    return
  }

  throw new TypeError('OpenCascade BRepFilletAPI_MakeFillet does not support Add')
}

function addChamferEdge (builder, distance, edge) {
  if (typeof builder.Add_2 === 'function') {
    builder.Add_2(distance, edge)
    return
  }

  if (typeof builder.Add === 'function') {
    builder.Add(distance, edge)
    return
  }

  throw new TypeError('OpenCascade BRepFilletAPI_MakeChamfer does not support Add')
}

function collectSelectedFaces (openCascade, value, properties) {
  const faceResult = collectShapeFaces(openCascade, value)
  const indexes = selectedFaceIndexes(properties)

  if (!indexes) {
    disposeTemporaryHandles(faceResult.handles)
    return { faces: [], handles: [] }
  }

  return {
    faces: indexes === 'all'
      ? faceResult.faces
      : faceResult.faces.filter((face, index) => indexes.has(index)),
    handles: faceResult.handles
  }
}

function collectShapeFaces (openCascade, value) {
  const explorer = constructOpenCascadeBinding(
    openCascade,
    ['TopExp_Explorer_2', 'TopExp_Explorer'],
    [
      value,
      topAbsShapeEnum(openCascade, 'TopAbs_FACE'),
      topAbsShapeEnum(openCascade, 'TopAbs_SHAPE')
    ]
  )
  const faces = []
  const handles = [explorer]

  while (explorer.More()) {
    const current = explorer.Current()
    const face = faceFromShape(openCascade, current)

    handles.push(current, face)
    faces.push(face)
    explorer.Next()
  }

  return { faces, handles }
}

function selectedFaceIndexes (properties) {
  const selection = properties.faces ?? properties.openFaces ?? properties.remove

  if (selection === undefined || selection === false || selection === 'none') {
    return null
  }

  if (selection === true || selection === 'all') {
    return 'all'
  }

  return new Set(parseVector(selection).map(Number))
}

function shapeListFromValues (openCascade, values) {
  const list = constructOpenCascadeBinding(openCascade, ['TopTools_ListOfShape_1', 'TopTools_ListOfShape'], [])

  for (const value of values) {
    appendShapeToList(list, value)
  }

  return { value: list, handles: [] }
}

function appendShapeToList (list, value) {
  if (typeof list.Append_1 === 'function') {
    list.Append_1(value)
    return
  }

  if (typeof list.Append === 'function') {
    list.Append(value)
    return
  }

  throw new TypeError('OpenCascade TopTools_ListOfShape does not support Append')
}

function offsetMode (openCascade, properties) {
  const mode = String(properties.mode || 'skin').toLowerCase()
  const suffix = {
    pipe: 'Pipe',
    recto: 'RectoVerso',
    rectoverso: 'RectoVerso',
    skin: 'Skin'
  }[mode] || 'Skin'

  return enumValue(openCascade, 'BRepOffset_Mode', `BRepOffset_${suffix}`, 0)
}

function joinType (openCascade, properties) {
  const join = String(properties.join || properties.joinType || 'arc').toLowerCase()
  const suffix = {
    arc: 'Arc',
    intersection: 'Intersection',
    tangent: 'Tangent'
  }[join] || 'Arc'

  return enumValue(openCascade, 'GeomAbs_JoinType', `GeomAbs_${suffix}`, 0)
}

function enumValue (openCascade, enumName, memberName, fallback) {
  const values = openCascade[enumName]

  if (!values || values[memberName] === undefined) {
    return fallback
  }

  return values[memberName]
}

function planeFromProperties (openCascade, properties) {
  const axis = axisCoordinatesFromProperties(properties)
  const origin = constructOpenCascadeBinding(openCascade, ['gp_Pnt_3', 'gp_Pnt'], axis.origin)
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], axis.direction)
  const value = constructOpenCascadeBindingWithArguments(
    openCascade,
    ['gp_Pln_3', 'gp_Pln'],
    [[origin, direction]]
  )

  return { value, handles: [origin, direction] }
}

function axisFromProperties (openCascade, properties) {
  const axis = axisCoordinatesFromProperties(properties)
  const origin = constructOpenCascadeBinding(openCascade, ['gp_Pnt_3', 'gp_Pnt'], axis.origin)
  const direction = constructOpenCascadeBinding(openCascade, ['gp_Dir_4', 'gp_Dir'], axis.direction)
  const value = constructOpenCascadeBinding(openCascade, ['gp_Ax1_2', 'gp_Ax1'], [origin, direction])

  return { value, handles: [origin, direction] }
}

function axisCoordinatesFromProperties (properties) {
  return {
    origin: originFromProperties(properties),
    direction: directionFromProperties(properties)
  }
}

function originFromProperties (properties) {
  if (properties.origin !== undefined) {
    return padVector(parseVector(properties.origin), 3)
  }

  if (properties.point !== undefined) {
    return padVector(parseVector(properties.point), 3)
  }

  return [0, 0, 0]
}

function directionFromProperties (properties) {
  if (properties.axis !== undefined) {
    return normalizeVector(padVector(parseVector(properties.axis), 3))
  }

  if (properties.direction !== undefined) {
    return normalizeVector(padVector(parseVector(properties.direction), 3))
  }

  if (properties.normal !== undefined) {
    return normalizeVector(padVector(parseVector(properties.normal), 3))
  }

  return [0, 0, 1]
}

function extrusionVectorFromProperties (properties) {
  if (properties.vector !== undefined) {
    return padVector(parseVector(properties.vector), 3)
  }

  if (properties.by !== undefined) {
    return padVector(parseVector(properties.by), 3)
  }

  const height = numberFromProperties(properties, ['height', 'h', 'distance', 'd'], 1)

  return directionFromProperties(properties).map((entry) => entry * height)
}

function normalizeVector (vector) {
  const magnitude = Math.hypot(...vector)

  if (!magnitude) {
    return [0, 0, 1]
  }

  return vector.map((entry) => entry / magnitude)
}

function importStepShape (openCascade, properties) {
  const file = importFileFromProperties(openCascade, properties, 'step')
  const reader = constructOpenCascadeBinding(openCascade, ['STEPControl_Reader_1', 'STEPControl_Reader'], [])

  try {
    reader.ReadFile(file.path)

    if (typeof reader.TransferRoots === 'function') {
      reader.TransferRoots()
    } else {
      const roots = typeof reader.NbRootsForTransfer === 'function' ? reader.NbRootsForTransfer() : 1

      for (let index = 1; index <= roots; index += 1) {
        reader.TransferRoot(index)
      }
    }

    return {
      value: extractReaderShape(reader),
      handles: [reader]
    }
  } finally {
    removeImportFile(openCascade, file)
  }
}

function importStlShape (openCascade, properties) {
  const file = importFileFromProperties(openCascade, properties, 'stl')
  const reader = constructOpenCascadeBinding(openCascade, ['StlAPI_Reader'], [])
  const value = constructOpenCascadeBinding(openCascade, ['TopoDS_Shape'], [])

  try {
    reader.Read(value, file.path)

    return { value, handles: [reader] }
  } finally {
    removeImportFile(openCascade, file)
  }
}

function importBrepShape (openCascade, properties) {
  const file = importFileFromProperties(openCascade, properties, 'brep')
  const value = constructOpenCascadeBinding(openCascade, ['TopoDS_Shape'], [])
  const builder = constructOpenCascadeBinding(openCascade, ['BRep_Builder'], [])

  try {
    readBrepFile(openCascade, value, file.path, builder)

    return { value, handles: [builder] }
  } finally {
    removeImportFile(openCascade, file)
  }
}

function extractReaderShape (reader) {
  if (typeof reader.OneShape === 'function') {
    return reader.OneShape()
  }

  if (typeof reader.Shape === 'function') {
    return reader.Shape(1)
  }

  throw new TypeError('OpenCascade STEPControl_Reader does not expose a transferred shape')
}

function readBrepFile (openCascade, value, path, builder) {
  const tools = openCascade.BRepTools

  if (tools && typeof tools.Read_2 === 'function') {
    tools.Read_2(value, path, builder)
    return
  }

  if (tools && typeof tools.Read_1 === 'function') {
    tools.Read_1(value, path, builder)
    return
  }

  throw new TypeError('OpenCascade BRepTools.Read is required for BREP import')
}

function importFileFromProperties (openCascade, properties, extension) {
  const source = properties.data ?? properties.source ?? properties.content ?? properties.text
  const path = properties.path ?? properties.file ?? properties.src ?? properties.href

  if (source !== undefined) {
    const temporaryPath = path || `/solidark-import.${extension}`

    writeOpenCascadeFile(openCascade, temporaryPath, source)
    return { path: temporaryPath, temporary: true }
  }

  if (path) {
    return { path: String(path), temporary: false }
  }

  throw new Error(`sol-${extension} requires path, file, src, href, data, source, content, or text`)
}

function writeOpenCascadeFile (openCascade, path, source) {
  if (!openCascade.FS || typeof openCascade.FS.writeFile !== 'function') {
    throw new TypeError('OpenCascade virtual file system is required for inline imports')
  }

  openCascade.FS.writeFile(path, source)
}

function removeImportFile (openCascade, file) {
  if (file.temporary && openCascade.FS && typeof openCascade.FS.unlink === 'function') {
    openCascade.FS.unlink(file.path)
  }
}

function buildLoft (builder, openCascade, handles) {
  if (typeof builder.Build !== 'function') {
    return
  }

  const progress = constructOptionalOpenCascadeBinding(openCascade, ['Message_ProgressRange_1', 'Message_ProgressRange'], [])

  if (progress) {
    handles.push(progress)

    try {
      builder.Build(progress)
      return
    } catch (error) {
      if (!isBindingArgumentCountError(error)) {
        throw error
      }

      disposeTemporaryHandles([progress])
      handles.pop()
    }
  }

  builder.Build()
}

function sketchAction (tag, action, properties) {
  return {
    method: tag.replace(/^sol-/, ''),
    category: 'sketch',
    tag,
    properties,
    children: [],
    action,
    point: action === 'close' ? null : pointFromProperties(properties),
    through: pointFromNamedProperties(properties, ['through', 'via', 'midpoint', 'middle', 'control']),
    disposed: false
  }
}

function pointFromProperties (properties) {
  if (properties.point !== undefined) {
    return padVector(parseVector(properties.point), 3)
  }

  if (properties.to !== undefined) {
    return padVector(parseVector(properties.to), 3)
  }

  if (properties.end !== undefined) {
    return padVector(parseVector(properties.end), 3)
  }

  return [
    numberFromProperties(properties, ['x'], 0),
    numberFromProperties(properties, ['y'], 0),
    numberFromProperties(properties, ['z'], 0)
  ]
}

function pointFromNamedProperties (properties, names) {
  for (const name of names) {
    if (properties[name] !== undefined) {
      return padVector(parseVector(properties[name]), 3)
    }
  }

  return null
}

function circleFromThreePoints (from, through, to) {
  const [x1, y1, z] = from
  const [x2, y2] = through
  const [x3, y3] = to
  const determinant = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))

  if (Math.abs(determinant) < Number.EPSILON) {
    throw new Error('sol-arc requires non-collinear points')
  }

  const first = x1 * x1 + y1 * y1
  const second = x2 * x2 + y2 * y2
  const third = x3 * x3 + y3 * y3
  const centerX = (first * (y2 - y3) + second * (y3 - y1) + third * (y1 - y2)) / determinant
  const centerY = (first * (x3 - x2) + second * (x1 - x3) + third * (x2 - x1)) / determinant
  const startAngle = Math.atan2(y1 - centerY, x1 - centerX)
  const throughAngle = Math.atan2(y2 - centerY, x2 - centerX)
  const rawEndAngle = Math.atan2(y3 - centerY, x3 - centerX)

  return {
    origin: [centerX, centerY, z],
    radius: Math.hypot(x1 - centerX, y1 - centerY),
    startAngle,
    endAngle: angleThrough(startAngle, throughAngle, rawEndAngle)
  }
}

function angleThrough (start, through, end) {
  const normalizedThrough = normalizeAngleAfter(through, start)
  const normalizedEnd = normalizeAngleAfter(end, start)

  return normalizedThrough <= normalizedEnd ? normalizedEnd : normalizedEnd - Math.PI * 2
}

function normalizeAngleAfter (angle, start) {
  let result = angle

  while (result < start) {
    result += Math.PI * 2
  }

  return result
}

function samePoint (left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function degreesToRadians (degrees) {
  return Number(degrees) * Math.PI / 180
}

function shape (category, tag, properties, children, value, handles = []) {
  return {
    method: tag.replace(/^sol-/, ''),
    category,
    tag,
    properties,
    children,
    value,
    handles,
    disposed: false
  }
}

function shapeValue (entry) {
  return entry && entry.value
}

function meshEntry (openCascade, entry, options, context = {}) {
  if (!entry) {
    return []
  }

  const styling = stylingForEntry(entry, context.styling)
  const children = entry.children || []

  if (shouldMeshChildren(entry, children)) {
    return children.flatMap((child) => meshEntry(openCascade, child, options, { styling }))
  }

  const value = shapeValue(entry)

  if (!value) {
    return children.flatMap((child) => meshEntry(openCascade, child, options, { styling }))
  }

  const mesh = applyMeshStyling(meshValue(openCascade, entry.tag, value, options), styling)

  return mesh.triangles.length > 0 ? [mesh] : []
}

function shouldMeshChildren (entry, children) {
  return children.length > 0 &&
    (entry.tag === 'sol-group' || (entry.tag === 'sol-union' && entry.properties?.implicit))
}

function stylingForEntry (entry, inherited) {
  return mergeStyling(
    mergeStyling(inherited, entry.styling),
    stylingFromProperties(entry.properties)
  )
}

function mergeStyling (current, next) {
  if (!current && !next) {
    return null
  }

  return {
    ...(current || {}),
    ...(next || {})
  }
}

function stylingFromProperties (properties = {}) {
  if (properties.color === undefined && properties.colour === undefined) {
    return null
  }

  return {
    color: properties.color ?? properties.colour
  }
}

function applyMeshStyling (mesh, styling) {
  if (!styling) {
    return mesh
  }

  mesh.styling = styling

  if (styling.color !== undefined) {
    mesh.color = styling.color
  }

  return mesh
}

function meshValue (openCascade, tag, value, options) {
  const handles = []

  try {
    const mesh = { tag, vertices: [], triangles: [] }
    const mesher = constructOpenCascadeBinding(
      openCascade,
      ['BRepMesh_IncrementalMesh_2', 'BRepMesh_IncrementalMesh'],
      [
        value,
        numberFromProperties(options, ['linearDeflection', 'deflection'], 0.1),
        false,
        numberFromProperties(options, ['angularDeflection'], 0.5),
        false
      ]
    )
    const explorer = constructOpenCascadeBinding(
      openCascade,
      ['TopExp_Explorer_2', 'TopExp_Explorer'],
      [
        value,
        topAbsShapeEnum(openCascade, 'TopAbs_FACE'),
        topAbsShapeEnum(openCascade, 'TopAbs_SHAPE')
      ]
    )

    handles.push(mesher, explorer)

    while (explorer.More()) {
      appendFaceMesh(openCascade, mesh, explorer.Current(), handles)
      explorer.Next()
    }

    return mesh
  } finally {
    disposeTemporaryHandles(handles)
  }
}

function appendFaceMesh (openCascade, mesh, current, handles) {
  const face = faceFromShape(openCascade, current)
  const location = constructOpenCascadeBinding(openCascade, ['TopLoc_Location_1', 'TopLoc_Location'], [])
  const triangulation = unwrapHandle(triangulationForFace(openCascade, face, location))

  handles.push(face, location)

  if (triangulation) {
    appendTriangulation(mesh, triangulation, location, handles)
  }
}

function appendTriangulation (mesh, triangulation, location, handles) {
  const offset = mesh.vertices.length
  const transform = locationTransformation(location, handles)

  for (let index = 1; index <= triangulation.NbNodes(); index += 1) {
    const point = triangulation.Node(index)
    handles.push(point)
    mesh.vertices.push(pointCoordinates(point, transform, handles))
  }

  for (let index = 1; index <= triangulation.NbTriangles(); index += 1) {
    const triangle = triangulation.Triangle(index)
    handles.push(triangle)
    mesh.triangles.push(triangleIndices(triangle).map((vertexIndex) => vertexIndex + offset))
  }
}

function triangulationForFace (openCascade, face, location) {
  const tool = openCascade.BRep_Tool

  if (!tool || typeof tool.Triangulation !== 'function') {
    throw new TypeError('OpenCascade BRep_Tool.Triangulation is required for mesh output')
  }

  if (tool.Triangulation.length === 2) {
    return tool.Triangulation(face, location)
  }

  try {
    return tool.Triangulation(face, location, meshPurpose(openCascade))
  } catch (error) {
    if (!isBindingArgumentCountError(error)) {
      throw error
    }

    return tool.Triangulation(face, location)
  }
}

function isBindingArgumentCountError (error) {
  return /invalid number of parameters|expected \d+ args/.test(String(error))
}

function topAbsShapeEnum (openCascade, name) {
  const shapeEnum = openCascade.TopAbs_ShapeEnum

  if (!shapeEnum || shapeEnum[name] === undefined) {
    return name
  }

  return shapeEnum[name]
}

function meshPurpose (openCascade) {
  const purpose = openCascade.Poly_MeshPurpose

  if (!purpose || purpose.Poly_MeshPurpose_NONE === undefined) {
    return 0
  }

  return purpose.Poly_MeshPurpose_NONE
}

function faceFromShape (openCascade, current) {
  if (openCascade.TopoDS && typeof openCascade.TopoDS.Face_1 === 'function') {
    return openCascade.TopoDS.Face_1(current)
  }

  return current
}

function unwrapHandle (handle) {
  if (handle && typeof handle.get === 'function') {
    return handle.get()
  }

  return handle
}

function locationTransformation (location, handles) {
  if (!location || typeof location.Transformation !== 'function') {
    return null
  }

  const transform = location.Transformation()
  handles.push(transform)
  return transform
}

function pointCoordinates (point, transform, handles) {
  const resolved = transform && typeof point.Transformed === 'function'
    ? point.Transformed(transform)
    : point

  if (resolved !== point) {
    handles.push(resolved)
  }

  return [Number(resolved.X()), Number(resolved.Y()), Number(resolved.Z())]
}

function triangleIndices (triangle) {
  return [
    triangle.Value(1) - 1,
    triangle.Value(2) - 1,
    triangle.Value(3) - 1
  ]
}

function disposeTemporaryHandles (handles) {
  const seen = new Set()

  for (const handle of handles) {
    deleteHandle(handle, seen)
  }
}

function disposeShape (entry, seen = new Set()) {
  if (!entry || entry.disposed) {
    return
  }

  for (const child of entry.children || []) {
    disposeShape(child, seen)
  }

  for (const handle of [...(entry.handles || []), entry.value]) {
    deleteHandle(handle, seen)
  }

  entry.disposed = true
}

function deleteHandle (handle, seen) {
  if (!handle || seen.has(handle) || typeof handle.delete !== 'function') {
    return
  }

  seen.add(handle)
  handle.delete()
}

function sizeFromProperties (properties) {
  if (properties.size !== undefined) {
    const [width, depth = width, height = depth] = parseVector(properties.size)
    return [width, depth, height].map(Number)
  }

  const width = numberFromProperties(properties, ['width', 'x'], 1)
  const depth = numberFromProperties(properties, ['depth', 'y'], width)
  const height = numberFromProperties(properties, ['height', 'z'], depth)

  return [width, depth, height]
}

function radiusFromProperties (properties) {
  return numberFromProperties(properties, ['radius', 'r'], 1)
}

function ellipseRadiiFromProperties (properties) {
  const radius = radiusFromProperties(properties)

  return [
    numberFromProperties(properties, ['radiusX', 'rx', 'majorRadius', 'major', 'x'], radius),
    numberFromProperties(properties, ['radiusY', 'ry', 'minorRadius', 'minor', 'y'], radius)
  ]
}

function pointsFromProperties (properties) {
  const source = properties.points ?? properties.vertices ?? []

  if (Array.isArray(source) && source.every(Array.isArray)) {
    return source.map((point) => padVector(point, 3))
  }

  const values = parseVector(source)
  const stride = Number(properties.stride || properties.dimensions || 2)
  const points = []

  for (let index = 0; index < values.length; index += stride) {
    points.push(padVector(values.slice(index, index + stride), 3))
  }

  return points
}

function vectorFromProperties (properties) {
  if (properties.by !== undefined) {
    return padVector(parseVector(properties.by), 3)
  }

  if (properties.vector !== undefined) {
    return padVector(parseVector(properties.vector), 3)
  }

  return [
    numberFromProperties(properties, ['x'], 0),
    numberFromProperties(properties, ['y'], 0),
    numberFromProperties(properties, ['z'], 0)
  ]
}

function scaleVectorFromProperties (properties) {
  const value = properties.by ?? properties.vector ?? properties.scale ?? properties.factor

  if (value !== undefined) {
    const vector = parseVector(value)
    const [x, y = x, z = y] = vector

    return [x, y, z].map(Number)
  }

  const x = numberFromProperties(properties, ['x'], 1)
  const y = numberFromProperties(properties, ['y'], x)
  const z = numberFromProperties(properties, ['z'], y)

  return [x, y, z]
}

function scaleMatrixValues ([x, y, z], origin) {
  return [
    x, 0, 0, origin[0] * (1 - x),
    0, y, 0, origin[1] * (1 - y),
    0, 0, z, origin[2] * (1 - z)
  ].map(cleanNumber)
}

function matrixValuesFromProperties (properties) {
  const values = parseVector(properties.values ?? properties.matrix ?? properties.transform ?? [])

  if (values.length === 16) {
    return [
      values[0], values[1], values[2], values[3],
      values[4], values[5], values[6], values[7],
      values[8], values[9], values[10], values[11]
    ].map(Number)
  }

  if (values.length === 12) {
    return values.map(Number)
  }

  if (values.length === 9) {
    return [
      values[0], values[1], values[2], 0,
      values[3], values[4], values[5], 0,
      values[6], values[7], values[8], 0
    ].map(Number)
  }

  throw new Error('sol-matrix requires 9, 12, or 16 numeric values')
}

function placementValuesFromProperties (properties) {
  const origin = originFromProperties(properties)
  const zAxis = directionFromProperties(properties)
  const xAxis = xDirectionFromProperties(properties, zAxis)
  const yAxis = cross(zAxis, xAxis)

  return [
    xAxis[0], yAxis[0], zAxis[0], origin[0],
    xAxis[1], yAxis[1], zAxis[1], origin[1],
    xAxis[2], yAxis[2], zAxis[2], origin[2]
  ].map(cleanNumber)
}

function xDirectionFromProperties (properties, zAxis) {
  const candidate = properties.xDirection ?? properties.xAxis ?? properties.refDirection ?? properties.reference
  const vector = candidate !== undefined
    ? normalizeVector(padVector(parseVector(candidate), 3))
    : perpendicularVector(zAxis)
  const rejected = subtract(vector, zAxis.map((entry) => entry * dot(vector, zAxis)))
  const normalized = normalizeVector(rejected)

  return samePoint(normalized, [0, 0, 1]) && Math.abs(dot(normalized, zAxis)) === 1
    ? perpendicularVector(zAxis)
    : normalized
}

function mirrorNormalFromProperties (properties) {
  if (properties.normal !== undefined) {
    return normalizeVector(padVector(parseVector(properties.normal), 3))
  }

  if (properties.plane !== undefined) {
    return normalizeVector(padVector(parseVector(properties.plane), 3))
  }

  return [1, 0, 0]
}

function sameScalar (values) {
  return values.every((value) => value === values[0])
}

function perpendicularVector (vector) {
  const candidate = Math.abs(dot(vector, [1, 0, 0])) < 0.9
    ? [1, 0, 0]
    : [0, 1, 0]

  return normalizeVector(subtract(candidate, vector.map((entry) => entry * dot(candidate, vector))))
}

function dot (left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0)
}

function cross (left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ]
}

function subtract (left, right) {
  return left.map((value, index) => value - right[index])
}

function cleanNumber (value) {
  return Object.is(value, -0) ? 0 : value
}

function padVector (vector, length) {
  return Array.from({ length }, (_, index) => Number(vector[index] || 0))
}

function numberFromProperties (properties, names, fallback) {
  for (const name of names) {
    if (properties[name] !== undefined) {
      return Number(properties[name])
    }
  }

  return fallback
}

function booleanFromProperties (properties, names, fallback) {
  for (const name of names) {
    if (properties[name] !== undefined) {
      return Boolean(properties[name])
    }
  }

  return fallback
}

function centeredFromProperties (properties) {
  if (properties.centered !== undefined) {
    return Boolean(properties.centered)
  }

  if (properties.center !== undefined) {
    return Boolean(properties.center)
  }

  return true
}

/* node:coverage ignore next 3 */
function importOpenCascadeModule (specifier) {
  return import(specifier)
}
