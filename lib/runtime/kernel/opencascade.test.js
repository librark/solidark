import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  OpencascadeKernel,
  constructOpenCascadeBinding,
  createOpenCascadeAdapter,
  createOpenCascadeKernel,
  loadOpenCascade
} from './opencascade.js'
import { MemoryKernel } from '../../base/kernel/index.js'

it('loads OpenCascade.js through the stable initOpenCascade entrypoint', async () => {
  const initOptions = { wasmBinaryFile: 'opencascade.wasm' }
  const openCascade = { ready: true }
  const loaded = await loadOpenCascade({
    initOptions,
    async importer (specifier) {
      assert.equal(specifier, 'opencascade.js')
      return {
        async initOpenCascade (receivedOptions) {
          assert.equal(receivedOptions, initOptions)
          return openCascade
        }
      }
    }
  })

  assert.equal(loaded, openCascade)
})

it('rejects modules without initOpenCascade', async () => {
  await assert.rejects(
    () => loadOpenCascade({
      async importer () {
        return {}
      }
    }),
    /initOpenCascade/
  )
})

it('loads OpenCascade.js through an Emscripten default factory', async () => {
  const initOptions = { locateFile: () => '/opencascade.wasm.wasm' }
  const openCascade = { ready: true }
  const loaded = await loadOpenCascade({
    initOptions,
    async importer (specifier) {
      assert.equal(specifier, 'opencascade.js')
      return {
        default (receivedOptions) {
          assert.equal(receivedOptions, initOptions)
          return openCascade
        }
      }
    }
  })

  assert.equal(loaded, openCascade)
})

it('creates a kernel adapter with the loaded OpenCascade module attached', async () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = await createOpenCascadeKernel({
    async importer () {
      return {
        async initOpenCascade () {
          return openCascade
        }
      }
    }
  })

  assert.equal(kernel.name, 'opencascade')
  assert.equal(kernel.openCascade, openCascade)
  assert.equal(kernel instanceof OpencascadeKernel, true)
  assert.equal(kernel instanceof MemoryKernel, true)
  assert.equal(kernel.cuboid({}).tag, 'sol-cuboid')
})

it('constructs the first available OpenCascade binding candidate', () => {
  class Binding {
    constructor (value) {
      this.value = value
    }
  }

  const binding = constructOpenCascadeBinding({ Missing: {}, Binding }, ['Missing', 'Binding'], ['value'])

  assert.equal(binding.value, 'value')
  assert.throws(
    () => constructOpenCascadeBinding({}, ['Missing']),
    /OpenCascade binding not found: Missing/
  )
})

it('builds centered and uncentered primitive OpenCascade shapes', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)

  const cuboid = kernel.cuboid({ size: [2], centered: true })
  const cuboidTransform = cuboid.value.builder
  assert.equal(cuboid.tag, 'sol-cuboid')
  assert.deepEqual(cuboidTransform.args[0].builder.args, [2, 2, 2])
  assert.deepEqual(cuboidTransform.args[1].translation.args, [-1, -1, -1])

  const uncentered = kernel.cuboid({ width: 2, y: 3, z: 4, centered: false })
  assert.deepEqual(uncentered.value.builder.args, [2, 3, 4])

  const sphere = kernel.sphere({ r: 5 })
  assert.equal(sphere.tag, 'sol-sphere')
  assert.deepEqual(sphere.value.builder.args, [5])

  const cylinder = kernel.cylinder({ radius: 3, h: 8 })
  const cylinderTransform = cylinder.value.builder
  assert.equal(cylinder.tag, 'sol-cylinder')
  assert.deepEqual(cylinderTransform.args[0].builder.args, [3, 8])
  assert.deepEqual(cylinderTransform.args[1].translation.args, [0, 0, -4])

  const uncenteredCylinder = kernel.cylinder({ center: false })
  assert.deepEqual(uncenteredCylinder.value.builder.args, [1, 1])

  const cone = kernel.cone({ radius1: 6, radius2: 2, height: 9 })
  const coneTransform = cone.value.builder
  assert.equal(cone.tag, 'sol-cone')
  assert.deepEqual(coneTransform.args[0].builder.args, [6, 2, 9])
  assert.deepEqual(coneTransform.args[1].translation.args, [0, 0, -4.5])

  const uncenteredCone = kernel.cone({ r1: 7, r2: 3, h: 11, centered: false })
  assert.deepEqual(uncenteredCone.value.builder.args, [7, 3, 11])

  const fallbackCone = kernel.cone({ bottomRadius: 5, topRadius: 1, center: false })
  assert.deepEqual(fallbackCone.value.builder.args, [5, 1, 1])

  const torus = kernel.torus({ majorRadius: 12, minorRadius: 3 })
  assert.equal(torus.tag, 'sol-torus')
  assert.deepEqual(torus.value.builder.args, [12, 3])

  const aliasTorus = kernel.torus({ r1: 10, tubeRadius: 2 })
  assert.deepEqual(aliasTorus.value.builder.args, [10, 2])

  const centerAliasCuboid = kernel.cuboid({ center: true })
  assert.deepEqual(centerAliasCuboid.value.builder.args[1].translation.args, [-0.5, -0.5, -0.5])
})

it('supports OpenCascade builders that already return shape handles', () => {
  const { openCascade } = createFakeOpenCascade({ shapeMethod: false })
  const kernel = createOpenCascadeAdapter(openCascade)
  const sphere = kernel.sphere({ radius: 2 })

  assert.equal(sphere.value.kind, 'sphere')
  assert.deepEqual(sphere.value.args, [2])
})

it('combines OpenCascade children with boolean operations', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.sphere({ radius: 1 })
  const second = kernel.cylinder({ radius: 1, height: 2, centered: false })
  const third = kernel.cuboid({ size: [1, 2, 3], centered: false })

  const emptyUnion = kernel.union({}, [null, { value: null }])
  assert.equal(emptyUnion.value, null)
  assert.deepEqual(emptyUnion.handles, [])

  const singleUnion = kernel.union({}, [first])
  assert.equal(singleUnion.value, first.value)
  assert.deepEqual(singleUnion.handles, [])

  const union = kernel.union({}, [first, second, third])
  assert.equal(union.tag, 'sol-union')
  assert.equal(union.value.builder.kind, 'fuse')
  assert.equal(union.handles.length, 6)
  assert.equal(union.value.builder.args[2].kind, 'progress')

  const difference = kernel.difference({}, [union, third])
  assert.equal(difference.tag, 'sol-difference')
  assert.equal(difference.value.builder.kind, 'cut')
  assert.equal(difference.value.builder.args[2].kind, 'progress')
})

it('supports OpenCascade boolean operations without progress range bindings', () => {
  const { openCascade } = createFakeOpenCascade({ progressRange: false })
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.sphere({ radius: 1 })
  const second = kernel.cuboid({ size: [2], centered: false })
  const union = kernel.union({}, [first, second])

  assert.equal(union.value.builder.kind, 'fuse')
  assert.deepEqual(union.value.builder.args, [first.value, second.value])
  assert.equal(union.handles.length, 2)
})

it('retries OpenCascade boolean operations when progress ranges are rejected', () => {
  const { openCascade, handles } = createFakeOpenCascade({ booleanArity: 2 })
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.sphere({ radius: 1 })
  const second = kernel.cuboid({ size: [2], centered: false })
  const union = kernel.union({}, [first, second])
  const progress = handles.find((handle) => handle.kind === 'progress')

  assert.equal(union.value.builder.kind, 'fuse')
  assert.deepEqual(union.value.builder.args, [first.value, second.value])
  assert.equal(progress.deleted, true)
  assert.equal(union.handles.includes(progress), false)
})

it('rethrows non-arity errors from OpenCascade boolean construction', () => {
  const { openCascade } = createFakeOpenCascade({ booleanArity: 'fatal-error' })
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.sphere({ radius: 1 })
  const second = kernel.cuboid({ size: [2], centered: false })

  assert.throws(
    () => kernel.union({}, [first, second]),
    /boolean exploded/
  )
})

it('translates OpenCascade children with vector properties', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const child = kernel.sphere()

  const emptyTranslation = kernel.translate({ by: [1, 2] }, [])
  assert.equal(emptyTranslation.value, null)

  const byTranslation = kernel.translate({ by: [1, 2] }, [child])
  assert.deepEqual(byTranslation.value.builder.args[1].translation.args, [1, 2, 0])
  assert.deepEqual(byTranslation.value.builder.args.slice(2), [true])

  const vectorTranslation = kernel.translate({ vector: '3 4 5' }, [child])
  assert.deepEqual(vectorTranslation.value.builder.args[1].translation.args, [3, 4, 5])

  const coordinateTranslation = kernel.translate({ x: 6, y: 7, z: 8 }, [child])
  assert.deepEqual(coordinateTranslation.value.builder.args[1].translation.args, [6, 7, 8])
})

it('supports OpenCascade translation fallback methods', () => {
  const { openCascade } = createFakeOpenCascade({ translationMethod: 'SetTranslationPart' })
  const kernel = createOpenCascadeAdapter(openCascade)
  const cuboid = kernel.cuboid()

  assert.equal(cuboid.value.builder.args[1].translationMethod, 'SetTranslationPart')
})

it('throws when OpenCascade transform bindings cannot translate', () => {
  const { openCascade } = createFakeOpenCascade({ translationMethod: null })
  const kernel = createOpenCascadeAdapter(openCascade)

  assert.throws(
    () => kernel.cuboid(),
    /does not support translation/
  )
})

it('disposes OpenCascade shape handles recursively once', () => {
  const { openCascade, handles } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const child = kernel.sphere()
  const parent = kernel.translate({ x: 1 }, [child])

  parent.handles.push(parent.value, parent.value, null, {})
  kernel.dispose(null)
  kernel.dispose({ disposed: true })
  const sparseEntry = { disposed: false }
  kernel.dispose(sparseEntry)
  kernel.dispose(parent)
  kernel.dispose(parent)

  assert.equal(sparseEntry.disposed, true)
  assert.equal(parent.disposed, true)
  assert.equal(child.disposed, true)
  assert.equal(parent.value.deleted, true)
  assert.equal(handles.filter((handle) => handle.deleted).length, new Set(handles.filter((handle) => handle.deleted)).size)
})

it('disposes intermediate OpenCascade values from centered primitives and chained booleans', () => {
  const { openCascade, handles } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.cuboid()
  const second = kernel.sphere()
  const third = kernel.cylinder()
  const fourth = kernel.cone()
  const fifth = kernel.torus()
  const union = kernel.union({}, [first, second, third, fourth, fifth])

  kernel.dispose(union)

  assert.equal(handles.every((handle) => handle.deleted), true)
})

it('tessellates OpenCascade shape values into renderable meshes', () => {
  const { openCascade, handles, meshShape } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = meshShape()
  const meshes = kernel.toMesh(
    { tag: 'sol-cuboid', value, children: [] },
    { linearDeflection: 0.25, angularDeflection: 0.75 }
  )

  assert.deepEqual(meshes, [
    {
      tag: 'sol-cuboid',
      vertices: [
        [10, 20, 30],
        [12, 20, 30],
        [10, 22, 31]
      ],
      triangles: [[0, 1, 2]]
    }
  ])

  const mesher = handles.find((handle) => handle.kind === 'mesh')
  const explorer = handles.find((handle) => handle.kind === 'explorer')

  assert.deepEqual(mesher.args.slice(1), [0.25, false, 0.75, false])
  assert.deepEqual(explorer.args.slice(1), ['face-enum', 'shape-enum'])
  assert.equal(openCascade.BRep_Tool.calls[0].purpose, 'mesh-purpose')
  assert.equal(handles.filter((handle) => temporaryMeshKind(handle.kind)).every((handle) => handle.deleted), true)
})

it('uses OpenCascade mesh fallbacks for optional metadata bindings', () => {
  const { openCascade, handles, meshShape } = createFakeOpenCascade({
    faceCast: false,
    locationTransformation: false,
    meshPurposeEnum: false,
    shapeEnum: false,
    wrappedTriangulation: false
  })
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = meshShape()
  const meshes = kernel.toMesh(
    { tag: 'sol-sphere', value, children: [] },
    { deflection: 0.2 }
  )
  const mesher = handles.find((handle) => handle.kind === 'mesh')
  const explorer = handles.find((handle) => handle.kind === 'explorer')

  assert.deepEqual(meshes[0].vertices, [
    [0, 0, 0],
    [2, 0, 0],
    [0, 2, 1]
  ])
  assert.deepEqual(mesher.args.slice(1), [0.2, false, 0.5, false])
  assert.deepEqual(explorer.args.slice(1), ['TopAbs_FACE', 'TopAbs_SHAPE'])
  assert.equal(openCascade.BRep_Tool.calls[0].purpose, 0)
})

it('supports OpenCascade builds with two-argument face triangulation', () => {
  const { openCascade, meshShape } = createFakeOpenCascade({ triangulationArity: 2 })
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = meshShape()
  const meshes = kernel.toMesh({ tag: 'sol-cuboid', value, children: [] })
  const call = openCascade.BRep_Tool.calls[0]

  assert.equal(meshes[0].tag, 'sol-cuboid')
  assert.equal(call.face.kind, 'face')
  assert.equal(call.location.kind, 'location')
  assert.equal('purpose' in call, false)
})

it('retries face triangulation when Embind rejects the mesh purpose argument', () => {
  const { openCascade, meshShape } = createFakeOpenCascade({ triangulationArity: 'binding-error' })
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = meshShape()
  const meshes = kernel.toMesh({ tag: 'sol-cuboid', value, children: [] })

  assert.equal(meshes[0].tag, 'sol-cuboid')
  assert.equal(openCascade.BRep_Tool.calls.length, 2)
  assert.equal(openCascade.BRep_Tool.calls[0].purpose, 'mesh-purpose')
  assert.equal('purpose' in openCascade.BRep_Tool.calls[1], false)
})

it('rethrows non-arity errors from face triangulation', () => {
  const { openCascade, meshShape } = createFakeOpenCascade({ triangulationArity: 'fatal-error' })
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = meshShape()

  assert.throws(
    () => kernel.toMesh({ tag: 'sol-cuboid', value, children: [] }),
    /mesh exploded/
  )
})

it('returns no mesh for empty or untriangulated OpenCascade entries', () => {
  const { openCascade, meshShape } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value: childValue } = meshShape()
  const { value: emptyValue } = meshShape(null)

  assert.deepEqual(kernel.toMesh(null), [])
  assert.deepEqual(kernel.toMesh({ tag: 'sol-empty' }), [])
  assert.deepEqual(kernel.toMesh({ tag: 'sol-empty', value: emptyValue, children: [] }), [])

  const meshes = kernel.toMesh({
    tag: 'sol-group',
    children: [
      { tag: 'sol-child', value: childValue, children: [] }
    ]
  })

  assert.equal(meshes[0].tag, 'sol-child')
})

it('rejects OpenCascade mesh output when triangulation support is missing', () => {
  const { openCascade, meshShape } = createFakeOpenCascade({ triangulationTool: false })
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = meshShape()

  assert.throws(
    () => kernel.toMesh({ tag: 'sol-cuboid', value, children: [] }),
    /BRep_Tool\.Triangulation/
  )
})

function createFakeOpenCascade ({
  booleanArity = null,
  shapeMethod = true,
  translationMethod = 'SetTranslation_1',
  faceCast = true,
  locationTransformation = true,
  meshPurposeEnum = true,
  shapeEnum = true,
  progressRange = true,
  triangulationTool = true,
  triangulationArity = 3,
  wrappedTriangulation = true
} = {}) {
  const handles = []

  class Handle {
    constructor (kind, args = []) {
      this.kind = kind
      this.args = args
      this.deleted = false
      handles.push(this)
    }

    delete () {
      this.deleted = true
    }
  }

  class Vector extends Handle {
    constructor (...args) {
      super('gp_Vec', args)
    }
  }

  class Transform extends Handle {
    constructor () {
      super('gp_Trsf')
    }
  }

  class MeshTransform extends Handle {
    constructor () {
      super('mesh-transform')
      this.offset = [10, 20, 30]
    }
  }

  class Point extends Handle {
    constructor (x, y, z) {
      super('point', [x, y, z])
      this.coordinates = [x, y, z]
    }

    X () {
      return this.coordinates[0]
    }

    Y () {
      return this.coordinates[1]
    }

    Z () {
      return this.coordinates[2]
    }

    Transformed (transform) {
      return new Point(
        this.coordinates[0] + transform.offset[0],
        this.coordinates[1] + transform.offset[1],
        this.coordinates[2] + transform.offset[2]
      )
    }
  }

  class Triangle extends Handle {
    constructor (a, b, c) {
      super('triangle', [a, b, c])
      this.indices = [a, b, c]
    }

    Value (index) {
      return this.indices[index - 1]
    }
  }

  class Triangulation extends Handle {
    constructor (nodes, triangles) {
      super('triangulation')
      this.nodes = nodes
      this.triangles = triangles
    }

    NbNodes () {
      return this.nodes.length
    }

    Node (index) {
      return this.nodes[index - 1]
    }

    NbTriangles () {
      return this.triangles.length
    }

    Triangle (index) {
      return this.triangles[index - 1]
    }
  }

  class Face extends Handle {
    constructor (triangulation, args = []) {
      super('face', args)
      this.triangulation = triangulation
    }
  }

  class Location extends Handle {
    constructor () {
      super('location')
    }
  }

  if (locationTransformation) {
    Location.prototype.Transformation = function getTransformation () {
      return new MeshTransform()
    }
  }

  class Mesher extends Handle {
    constructor (...args) {
      super('mesh', args)
    }
  }

  class Explorer extends Handle {
    constructor (...args) {
      super('explorer', args)
      this.faces = args[0].faces || []
      this.index = 0
    }

    More () {
      return this.index < this.faces.length
    }

    Current () {
      return this.faces[this.index]
    }

    Next () {
      this.index += 1
    }
  }

  if (translationMethod) {
    Transform.prototype[translationMethod] = function setTranslation (offset) {
      this.translation = offset
      this.translationMethod = translationMethod
    }
  }

  const openCascade = {
    BRepPrimAPI_MakeBox_1: createBuilderClass(Handle, 'box', shapeMethod),
    BRepPrimAPI_MakeBox: createBuilderClass(Handle, 'box', shapeMethod),
    BRepPrimAPI_MakeSphere_1: createBuilderClass(Handle, 'sphere', shapeMethod),
    BRepPrimAPI_MakeSphere: createBuilderClass(Handle, 'sphere', shapeMethod),
    BRepPrimAPI_MakeCylinder_1: createBuilderClass(Handle, 'cylinder', shapeMethod),
    BRepPrimAPI_MakeCylinder: createBuilderClass(Handle, 'cylinder', shapeMethod),
    BRepPrimAPI_MakeCone_1: createBuilderClass(Handle, 'cone', shapeMethod),
    BRepPrimAPI_MakeCone: createBuilderClass(Handle, 'cone', shapeMethod),
    BRepPrimAPI_MakeTorus_1: createBuilderClass(Handle, 'torus', shapeMethod),
    BRepPrimAPI_MakeTorus: createBuilderClass(Handle, 'torus', shapeMethod),
    BRepBuilderAPI_Transform: createBuilderClass(Handle, 'transform', shapeMethod),
    BRepAlgoAPI_Fuse: createBooleanBuilderClass(Handle, 'fuse', shapeMethod, booleanArity),
    BRepAlgoAPI_Cut: createBooleanBuilderClass(Handle, 'cut', shapeMethod, booleanArity),
    BRepMesh_IncrementalMesh: Mesher,
    TopExp_Explorer: Explorer,
    TopLoc_Location: Location,
    gp_Trsf: Transform,
    gp_Vec: Vector
  }

  if (progressRange) {
    openCascade.Message_ProgressRange_1 = createBuilderClass(Handle, 'progress', false)
  }

  if (shapeEnum) {
    openCascade.TopAbs_ShapeEnum = {
      TopAbs_FACE: 'face-enum',
      TopAbs_SHAPE: 'shape-enum'
    }
  }

  if (meshPurposeEnum) {
    openCascade.Poly_MeshPurpose = {
      Poly_MeshPurpose_NONE: 'mesh-purpose'
    }
  }

  if (faceCast) {
    openCascade.TopoDS = {
      Face_1 (current) {
        return new Face(current.triangulation, [current])
      }
    }
  }

  if (triangulationTool) {
    openCascade.BRep_Tool = {
      calls: []
    }

    if (triangulationArity === 2) {
      openCascade.BRep_Tool.Triangulation = function triangulation (face, location) {
        return getTriangulation.call(this, face, location, wrappedTriangulation)
      }
    } else if (triangulationArity === 'binding-error') {
      openCascade.BRep_Tool.Triangulation = function triangulation (...args) {
        const [face, location, purpose] = args

        if (args.length > 2) {
          this.calls.push({ face, location, purpose })
          throw new Error('function BRep_Tool.Triangulation called with 3 arguments, expected 2 args!')
        }

        this.calls.push({ face, location })
        return triangulationResult(face, wrappedTriangulation)
      }
    } else if (triangulationArity === 'fatal-error') {
      openCascade.BRep_Tool.Triangulation = function triangulation (face, location, purpose) {
        this.calls.push({ face, location, purpose })
        throw new Error('mesh exploded')
      }
    } else {
      openCascade.BRep_Tool.Triangulation = function triangulation (face, location, purpose) {
        this.calls.push({ face, location, purpose })
        return triangulationResult(face, wrappedTriangulation)
      }
    }
  }

  function getTriangulation (face, location, wrappedTriangulation) {
    this.calls.push({ face, location })

    return triangulationResult(face, wrappedTriangulation)
  }

  function triangulationResult (face, wrappedTriangulation) {
    if (!face.triangulation) {
      return null
    }

    return wrappedTriangulation
      ? { get: () => face.triangulation }
      : face.triangulation
  }

  function meshShape (
    nodeValues = [
      [0, 0, 0],
      [2, 0, 0],
      [0, 2, 1]
    ],
    triangleValues = [[1, 2, 3]]
  ) {
    const triangulation = nodeValues
      ? new Triangulation(
        nodeValues.map(([x, y, z]) => new Point(x, y, z)),
        triangleValues.map(([a, b, c]) => new Triangle(a, b, c))
      )
      : null
    const face = new Face(triangulation)
    const value = new Handle('shape')
    value.faces = [face]

    return { face, triangulation, value }
  }

  return {
    handles,
    meshShape,
    openCascade
  }
}

function createBuilderClass (Handle, kind, shapeMethod) {
  if (!shapeMethod) {
    return class Builder extends Handle {
      constructor (...args) {
        super(kind, args)
      }
    }
  }

  return class Builder extends Handle {
    constructor (...args) {
      super(kind, args)
    }

    Shape () {
      const shape = new Handle(`${kind}:shape`, this.args)
      shape.builder = this
      return shape
    }
  }
}

function createBooleanBuilderClass (Handle, kind, shapeMethod, arity) {
  const Builder = createBuilderClass(Handle, kind, shapeMethod)

  return class BooleanBuilder extends Builder {
    constructor (...args) {
      if (arity === 'fatal-error') {
        throw new Error('boolean exploded')
      }

      if (typeof arity === 'number' && args.length !== arity) {
        throw new Error(`BindingError: invalid number of parameters (${args.length}) - expected (${arity}) parameters instead!`)
      }

      super(...args)
    }
  }
}

function temporaryMeshKind (kind) {
  return [
    'explorer',
    'location',
    'mesh',
    'mesh-transform',
    'point',
    'triangle'
  ].includes(kind)
}
