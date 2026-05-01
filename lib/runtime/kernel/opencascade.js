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

  translate (properties = {}, children = []) {
    const openCascade = this.openCascade
    const combined = combineChildren(openCascade, children)
    const placed = combined.value
      ? translateValue(openCascade, combined.value, vectorFromProperties(properties), combined.handles)
      : combined

    return shape('transform', 'sol-translate', properties, children, placed.value, placed.handles)
  }

  union (properties = {}, children = []) {
    const result = combineBoolean(this.openCascade, ['BRepAlgoAPI_Fuse_3', 'BRepAlgoAPI_Fuse'], children)

    return shape('operation', 'sol-union', properties, children, result.value, result.handles)
  }

  difference (properties = {}, children = []) {
    const result = combineBoolean(this.openCascade, ['BRepAlgoAPI_Cut_3', 'BRepAlgoAPI_Cut'], children)

    return shape('operation', 'sol-difference', properties, children, result.value, result.handles)
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

function shape (category, tag, properties, children, value, handles = []) {
  return {
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

function meshEntry (openCascade, entry, options) {
  if (!entry) {
    return []
  }

  const value = shapeValue(entry)

  if (!value) {
    return (entry.children || []).flatMap((child) => meshEntry(openCascade, child, options))
  }

  const mesh = meshValue(openCascade, entry.tag, value, options)

  return mesh.triangles.length > 0 ? [mesh] : []
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
