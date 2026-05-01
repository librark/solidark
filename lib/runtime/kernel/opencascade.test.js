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

it('builds OpenCascade sketch primitive wires', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)

  const circle = kernel.circle({ radius: 2, segments: 4 })
  assert.equal(circle.tag, 'sol-circle')
  assert.equal(circle.category, 'sketch')
  assert.equal(circle.value.edges.length, 4)
  assert.deepEqual(circle.value.edges[0].builder.args[0].coordinates, [2, 0, 0])

  const exactCircle = kernel.circle({ radius: 3 })
  assert.equal(exactCircle.value.edges.length, 1)
  assert.equal(exactCircle.value.edges[0].builder.args[0].kind, 'gp_Circ')
  assert.equal(exactCircle.value.edges[0].builder.args[0].radius, 3)

  const rectangle = kernel.rectangle({ size: [4, 2] })
  assert.equal(rectangle.tag, 'sol-rectangle')
  assert.equal(rectangle.value.edges.length, 4)
  assert.deepEqual(rectangle.value.edges[0].builder.args[0].coordinates, [-2, -1, 0])

  const uncenteredRectangle = kernel.rectangle({ width: 3, height: 5, centered: false })
  assert.deepEqual(uncenteredRectangle.value.edges[0].builder.args[0].coordinates, [0, 0, 0])
  assert.deepEqual(uncenteredRectangle.value.edges[0].builder.args[1].coordinates, [3, 0, 0])

  const polygon = kernel.polygon({ points: '0 0, 2 0, 1 1' })
  assert.equal(polygon.tag, 'sol-polygon')
  assert.equal(polygon.value.edges.length, 3)

  const polygon3d = kernel.polygon({ points: [0, 0, 1, 2, 0, 1, 1, 1, 1], stride: 3 })
  assert.deepEqual(polygon3d.value.edges[0].builder.args[0].coordinates, [0, 0, 1])

  const verticesPolygon = kernel.polygon({ vertices: '0 0 1 0 1 1', dimensions: 2 })
  assert.equal(verticesPolygon.value.edges.length, 3)

  const emptyPolygon = kernel.polygon({})
  assert.equal(emptyPolygon.value, null)

  const polyline = kernel.polyline({ points: [[0, 0], [1, 0], [1, 1]] })
  assert.equal(polyline.tag, 'sol-polyline')
  assert.equal(polyline.value.edges.length, 2)

  const closedPolyline = kernel.polyline({ points: '0 0 1 0 1 1', closed: true })
  assert.equal(closedPolyline.value.edges.length, 3)

  assert.equal(kernel.polyline({ points: '0 0' }).value, null)
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

it('rotates OpenCascade children with degree vector properties', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const child = kernel.cuboid({ centered: false })

  const emptyRotation = kernel.rotate({ by: [0, 0, 45] }, [])
  assert.equal(emptyRotation.value, null)

  const rotation = kernel.rotate({ by: [0, 0, 90] }, [child])
  const transform = rotation.value.builder.args[1]

  assert.equal(rotation.tag, 'sol-rotate')
  assert.deepEqual(transform.rotation.axis.direction.args, [0, 0, 1])
  assert.equal(transform.rotation.radians, Math.PI / 2)
})

it('applies OpenCascade scale, mirror, matrix, place, and workplane transforms', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const child = kernel.cuboid({ centered: false })

  assert.equal(kernel.scale({}, []).value, null)
  assert.equal(kernel.mirror({}, []).value, null)
  assert.equal(kernel.matrix({ values: '1 0 0 0 1 0 0 0 1' }, []).value, null)
  assert.equal(kernel.place({}, []).value, null)
  assert.equal(kernel.workplane({}, []).value, null)

  const uniformScale = kernel.scale({ factor: 2, origin: '1 2 3' }, [child])
  assert.equal(uniformScale.tag, 'sol-scale')
  assert.equal(uniformScale.value.builder.args[1].scale.factor, 2)
  assert.deepEqual(uniformScale.value.builder.args[1].scale.origin.coordinates, [1, 2, 3])

  const nonUniformScale = kernel.scale({ by: [2, 3, 4], origin: [1, 1, 1] }, [child])
  assert.deepEqual(nonUniformScale.value.builder.args[1].values, [
    2, 0, 0, -1,
    0, 3, 0, -2,
    0, 0, 4, -3
  ])

  const coordinateScale = kernel.scale({ x: 2, y: 3 }, [child])
  assert.deepEqual(coordinateScale.value.builder.args[1].values, [
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 3, 0
  ])

  const vectorScale = kernel.scale({ vector: '2 2 2' }, [child])
  assert.equal(vectorScale.value.builder.args[1].scale.factor, 2)

  const scaleAlias = kernel.scale({ scale: '2 3 4' }, [child])
  assert.deepEqual(scaleAlias.value.builder.args[1].values, [
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0
  ])

  const mirror = kernel.mirror({ normal: '0 1 0', origin: '1 2 3' }, [child])
  assert.equal(mirror.tag, 'sol-mirror')
  assert.deepEqual(mirror.value.builder.args[1].mirrorPlane.direction.args, [0, 1, 0])
  assert.deepEqual(mirror.value.builder.args[1].mirrorPlane.origin.coordinates, [1, 2, 3])

  const matrix = kernel.matrix({ values: '1 0 0 4 0 1 0 5 0 0 1 6' }, [child])
  assert.equal(matrix.tag, 'sol-matrix')
  assert.deepEqual(matrix.value.builder.args[1].values, [1, 0, 0, 4, 0, 1, 0, 5, 0, 0, 1, 6])

  const matrix9 = kernel.matrix({ values: '1 0 0 0 1 0 0 0 1' }, [child])
  assert.deepEqual(matrix9.value.builder.args[1].values, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0])

  const matrix16 = kernel.matrix({ values: '1 0 0 7 0 1 0 8 0 0 1 9 0 0 0 1' }, [child])
  assert.deepEqual(matrix16.value.builder.args[1].values, [1, 0, 0, 7, 0, 1, 0, 8, 0, 0, 1, 9])

  const matrixAlias = kernel.matrix({ matrix: '1 0 0 1 0 1 0 2 0 0 1 3' }, [child])
  assert.deepEqual(matrixAlias.value.builder.args[1].values, [1, 0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 3])

  const transformAlias = kernel.matrix({ transform: '1 0 0 3 0 1 0 2 0 0 1 1' }, [child])
  assert.deepEqual(transformAlias.value.builder.args[1].values, [1, 0, 0, 3, 0, 1, 0, 2, 0, 0, 1, 1])

  const place = kernel.place({ origin: '1 2 3', direction: '0 0 1', xDirection: '1 0 0' }, [child])
  assert.equal(place.tag, 'sol-place')
  assert.deepEqual(place.value.builder.args[1].values, [1, 0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 3])

  const xAxisPlace = kernel.place({ direction: '1 0 0', xAxis: '0 1 0' }, [child])
  assert.deepEqual(xAxisPlace.value.builder.args[1].values, [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0])

  const refDirectionPlace = kernel.place({ direction: '1 0 0', refDirection: '0 1 0' }, [child])
  assert.deepEqual(refDirectionPlace.value.builder.args[1].values, [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0])

  const referencePlace = kernel.place({ direction: '1 0 0', reference: '0 1 0' }, [child])
  assert.deepEqual(referencePlace.value.builder.args[1].values, [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0])

  const parallelPlace = kernel.place({ direction: '0 0 1', xDirection: '0 0 5' }, [child])
  assert.deepEqual(parallelPlace.value.builder.args[1].values, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0])

  const defaultXPlace = kernel.place({ direction: '1 0 0' }, [child])
  assert.deepEqual(defaultXPlace.value.builder.args[1].values, [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0])

  const workplane = kernel.workplane({ origin: '0 0 2', normal: '0 1 0' }, [child])
  assert.equal(workplane.tag, 'sol-workplane')
  assert.deepEqual(workplane.value.builder.args[1].values, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 2])

  assert.throws(
    () => kernel.matrix({}, [child]),
    /requires 9, 12, or 16/
  )

  const planeMirror = kernel.mirror({ plane: '0 0 1' }, [child])
  assert.deepEqual(planeMirror.value.builder.args[1].mirrorPlane.direction.args, [0, 0, 1])

  const defaultMirror = kernel.mirror({}, [child])
  assert.deepEqual(defaultMirror.value.builder.args[1].mirrorPlane.direction.args, [1, 0, 0])

  assert.throws(
    () => kernel.matrix({ values: '1 0 0 1' }, [child]),
    /requires 9, 12, or 16/
  )
})

it('supports OpenCascade transform bindings with alternate point shapes', () => {
  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const child = kernel.cuboid({ centered: false })

    openCascade.gp_Pnt = class ArgsOnlyPoint {
      constructor (...args) {
        this.args = args
      }
    }

    const scale = kernel.scale({ by: '2 3 4', origin: '1 1 1' }, [child])
    assert.deepEqual(scale.value.builder.args[1].values, [
      2, 0, 0, -1,
      0, 3, 0, -2,
      0, 0, 4, -3
    ])
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const child = kernel.cuboid({ centered: false })

    openCascade.gp_Pnt = class EmptyPoint {}

    const scale = kernel.scale({ by: '2 3 4', origin: '1 1 1' }, [child])
    assert.deepEqual(scale.value.builder.args[1].values, [
      2, 0, 0, -1,
      0, 3, 0, -2,
      0, 0, 4, -3
    ])
  }
})

it('surfaces unsupported OpenCascade transform feature bindings', () => {
  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const child = kernel.cuboid({ centered: false })

    openCascade.gp_Trsf.prototype.SetScale = null
    assert.throws(
      () => kernel.scale({ factor: 2 }, [child]),
      /does not support scale/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const child = kernel.cuboid({ centered: false })

    openCascade.gp_Trsf.prototype.SetMirror_3 = null
    openCascade.gp_Trsf.prototype.SetMirror = function setMirror (plane) {
      this.mirrorPlane = plane
      this.mirrorMethod = 'SetMirror'
    }
    const mirror = kernel.mirror({ normal: '0 1 0' }, [child])
    assert.equal(mirror.value.builder.args[1].mirrorMethod, 'SetMirror')

    openCascade.gp_Trsf.prototype.SetMirror = null
    assert.throws(
      () => kernel.mirror({ normal: '0 1 0' }, [child]),
      /does not support plane mirror/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const child = kernel.cuboid({ centered: false })

    openCascade.gp_Trsf.prototype.SetValues = null
    assert.throws(
      () => kernel.matrix({ values: '1 0 0 0 1 0 0 0 1' }, [child]),
      /does not support matrix values/
    )
  }
})

it('supports OpenCascade intersections and empty feature wrappers', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.sphere()
  const second = kernel.cuboid({ centered: false })

  const intersection = kernel.intersection({}, [first, second])
  assert.equal(intersection.tag, 'sol-intersection')
  assert.equal(intersection.value.builder.kind, 'common')

  const group = kernel.group({}, [first, second])
  assert.equal(group.tag, 'sol-group')
  assert.equal(group.value.builder.kind, 'fuse')

  const fillet = kernel.fillet({ radius: 2 }, [first])
  assert.equal(fillet.tag, 'sol-fillet')
  assert.equal(fillet.value, first.value)

  const chamfer = kernel.chamfer({ distance: 1 }, [second])
  assert.equal(chamfer.tag, 'sol-chamfer')
  assert.equal(chamfer.value, second.value)

  const emptyFillet = kernel.fillet({}, [])
  assert.equal(emptyFillet.value, null)

  const emptyChamfer = kernel.chamfer({}, [])
  assert.equal(emptyChamfer.value, null)
})

it('applies OpenCascade fillets and chamfers to selected edges', () => {
  const { openCascade, solidShape } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = solidShape(3)

  const fillet = kernel.fillet({ radius: 2 }, [{ value }])
  assert.equal(fillet.tag, 'sol-fillet')
  assert.equal(fillet.value.builder.kind, 'fillet-feature')
  assert.equal(fillet.value.builder.edges.length, 3)
  assert.deepEqual(fillet.value.builder.edges.map((entry) => entry.amount), [2, 2, 2])

  const chamfer = kernel.chamfer({ distance: 1.5, edges: [1] }, [{ value }])
  assert.equal(chamfer.tag, 'sol-chamfer')
  assert.equal(chamfer.value.builder.kind, 'chamfer-feature')
  assert.equal(chamfer.value.builder.edges.length, 1)
  assert.equal(chamfer.value.builder.edges[0].edge.source, value.edges[1])
  assert.equal(chamfer.value.builder.edges[0].amount, 1.5)

  const selectedFillet = kernel.fillet({ edge: 0, r: 0.5 }, [{ value }])
  assert.equal(selectedFillet.value.builder.edges.length, 1)
  assert.equal(selectedFillet.value.builder.edges[0].amount, 0.5)

  const selectAll = kernel.fillet({ select: 'all' }, [{ value }])
  assert.equal(selectAll.value.builder.edges.length, 3)

  const explicitAll = kernel.chamfer({ edges: true, d: 2 }, [{ value }])
  assert.equal(explicitAll.value.builder.edges.length, 3)

  const none = kernel.chamfer({ edges: false }, [{ value }])
  assert.equal(none.value, value)

  const namedNone = kernel.fillet({ edge: 'none' }, [{ value }])
  assert.equal(namedNone.value, value)
})

it('supports OpenCascade edge feature fallbacks and strict failures', () => {
  {
    const { openCascade, solidShape } = createFakeOpenCascade({ featureAddMethod: 'Add' })
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape(1)

    delete openCascade.TopoDS.Edge_1
    const fillet = kernel.fillet({ radius: 2 }, [{ value }])
    const chamfer = kernel.chamfer({ radius: 1 }, [{ value }])

    assert.equal(fillet.value.builder.edges[0].method, 'Add')
    assert.equal(fillet.value.builder.edges[0].amount, 2)
    assert.equal(chamfer.value.builder.edges[0].method, 'Add')
    assert.equal(chamfer.value.builder.edges[0].edge, value.edges[0])
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade({
      featureAddMethod: 'Add',
      shapeEnum: false
    })
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape(1)

    delete openCascade.TopoDS
    const fillet = kernel.fillet({ radius: 3 }, [{ value }])

    assert.equal(fillet.value.builder.edges[0].edge, value.edges[0])
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade({ featureAddMethod: null })
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape(1)
    const fallback = kernel.fillet({ radius: 1 }, [{ value }])

    assert.equal(fallback.value, value)
    assert.throws(
      () => kernel.fillet({ radius: 1, strict: true }, [{ value }]),
      /does not support Add/
    )
    assert.throws(
      () => kernel.chamfer({ distance: 1, strict: true }, [{ value }]),
      /does not support Add/
    )
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade({ featureBuildError: true })
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape(1)
    const fallback = kernel.chamfer({ distance: 1 }, [{ value }])

    assert.equal(fallback.value, value)
    assert.throws(
      () => kernel.chamfer({ distance: 1, strict: true }, [{ value }]),
      /feature exploded/
    )
  }
})

it('builds OpenCascade sketch wires and lofted solids', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const first = kernel.sketch({}, [
    kernel.move({ point: [-1, -1] }),
    kernel.line({ point: [1, -1] }),
    kernel.line({ point: [1, 1] }),
    kernel.line({ point: [-1, 1] }),
    kernel.close()
  ])
  const second = kernel.translate({ z: 3 }, [
    kernel.sketch({}, [
      kernel.move({ point: [-0.5, -0.5] }),
      kernel.line({ point: [0.5, -0.5] }),
      kernel.line({ point: [0.5, 0.5] }),
      kernel.line({ point: [-0.5, 0.5] }),
      kernel.close()
    ])
  ])
  const loft = kernel.loft({ ruled: true, tolerance: 0.001 }, [first, second])

  assert.equal(first.tag, 'sol-sketch')
  assert.equal(first.value.kind, 'wire:wire')
  assert.equal(first.value.edges.length, 4)
  assert.equal(second.value.builder.kind, 'transform')
  assert.equal(loft.tag, 'sol-loft')
  assert.equal(loft.value.builder.kind, 'loft')
  assert.equal(loft.value.wires.length, 2)
  assert.equal(loft.value.wires[0].kind, 'cast-wire')
  assert.deepEqual(loft.value.builder.args, [true, true, 0.001])
  assert.equal(loft.value.builder.built, true)
})

it('supports OpenCascade fallback methods for rotation, sketching, and lofting', () => {
  const { openCascade, handles } = createFakeOpenCascade({
    edgeShapeMethod: 'Shape',
    loftAddWireMethod: 'AddWire_1',
    loftArity: 2,
    loftBuildArity: 0,
    rotationMethod: 'SetRotation',
    wireAddMethod: 'Add_1',
    wireShapeMethod: 'Shape'
  })
  const kernel = createOpenCascadeAdapter(openCascade)
  const child = kernel.cuboid({ centered: false })
  const rotation = kernel.rotate({ x: 180 }, [child])
  const sketch = kernel.sketch({}, [
    null,
    kernel.sphere(),
    kernel.move({ to: '0 0 0' }),
    kernel.line({ x: 2, y: 0, z: 0 })
  ])
  const closedPoint = kernel.sketch({}, [
    kernel.move({ point: [0, 0] }),
    kernel.close()
  ])
  const loft = kernel.loft({ solid: false }, [
    sketch,
    kernel.translate({ z: 1 }, [sketch])
  ])
  const progress = handles.find((handle) => handle.kind === 'progress')

  assert.equal(rotation.value.builder.args[1].rotationMethod, 'SetRotation')
  assert.deepEqual(rotation.value.builder.args[1].rotation.axis.direction.args, [1, 0, 0])
  assert.equal(sketch.value.kind, 'wire:shape')
  assert.equal(sketch.value.edges[0].kind, 'edge:shape')
  assert.equal(closedPoint.value, null)
  assert.deepEqual(loft.value.builder.args, [false, false])
  assert.equal(loft.value.builder.built, true)
  assert.equal(progress.deleted, true)
  assert.equal(loft.handles.includes(progress), false)
})

it('handles empty and single-section OpenCascade lofts directly', () => {
  const { openCascade } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const sketch = kernel.sketch({}, [
    kernel.move({ point: [0, 0] }),
    kernel.line({ point: [1, 0] })
  ])

  const emptySketch = kernel.sketch({}, [])
  const emptyLoft = kernel.loft({}, [])
  const singleLoft = kernel.loft({}, [sketch])

  assert.equal(emptySketch.value, null)
  assert.equal(emptyLoft.value, null)
  assert.equal(singleLoft.value, sketch.value)

  delete openCascade.TopoDS.Wire_1
  const uncastLoft = kernel.loft({}, [sketch, sketch])

  assert.equal(uncastLoft.value.wires[0], sketch.value)
})

it('surfaces unsupported OpenCascade transform, wire, and loft bindings', () => {
  {
    const { openCascade } = createFakeOpenCascade({ rotationMethod: null })
    const kernel = createOpenCascadeAdapter(openCascade)
    const child = kernel.cuboid({ centered: false })

    assert.throws(
      () => kernel.rotate({ z: 45 }, [child]),
      /does not support rotation/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade({ wireAddMethod: null })
    const kernel = createOpenCascadeAdapter(openCascade)

    assert.throws(
      () => kernel.sketch({}, [
        kernel.move({ point: [0, 0] }),
        kernel.line({ point: [1, 0] })
      ]),
      /MakeWire does not support Add/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade({ loftAddWireMethod: null })
    const kernel = createOpenCascadeAdapter(openCascade)

    assert.throws(
      () => kernel.loft({}, [{ value: {} }, { value: {} }]),
      /ThruSections does not support AddWire/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade({ loftArity: 'fatal-error' })
    const kernel = createOpenCascadeAdapter(openCascade)

    assert.throws(
      () => kernel.loft({}, [{ value: {} }, { value: {} }]),
      /loft exploded/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade({ loftArity: 99 })
    const kernel = createOpenCascadeAdapter(openCascade)

    assert.throws(
      () => kernel.loft({}, [{ value: {} }, { value: {} }]),
      /expected \(99\) parameters/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade({ loftBuildMethod: null })
    const kernel = createOpenCascadeAdapter(openCascade)
    const loft = kernel.loft({}, [{ value: {} }, { value: {} }])

    assert.equal(loft.value.builder.built, false)
  }

  {
    const { openCascade } = createFakeOpenCascade({ loftBuildArity: 'fatal-error' })
    const kernel = createOpenCascadeAdapter(openCascade)

    assert.throws(
      () => kernel.loft({}, [{ value: {} }, { value: {} }]),
      /loft build exploded/
    )
  }
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

it('builds OpenCascade profile, extrusion, revolution, and sweep features', () => {
  const { openCascade, solidShape } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const sketch = kernel.sketch({}, [
    kernel.move({ point: [-1, -1] }),
    kernel.line({ point: [1, -1] }),
    kernel.line({ point: [1, 1] }),
    kernel.line({ point: [-1, 1] }),
    kernel.close()
  ])
  const path = kernel.sketch({}, [
    kernel.move({ point: [0, 0, 0] }),
    kernel.line({ point: [0, 0, 8] })
  ])

  const face = kernel.face({}, [sketch])
  assert.equal(face.tag, 'sol-face')
  assert.equal(face.value.builder.kind, 'face-builder')
  assert.equal(face.value.builder.args[0].kind, 'cast-wire')

  const extrude = kernel.extrude({ height: 4, centered: false }, [sketch])
  assert.equal(extrude.tag, 'sol-extrude')
  assert.equal(extrude.value.builder.kind, 'prism')
  assert.deepEqual(extrude.value.builder.args[1].args, [0, 0, 4])

  const centeredExtrude = kernel.extrude({ direction: '0 0 2' }, [sketch])
  assert.equal(centeredExtrude.value.builder.kind, 'transform')
  assert.equal(centeredExtrude.value.builder.args[1].translation.args[2], -0.5)

  const { value: solid } = solidShape()
  const rawExtrude = kernel.extrude({ vector: [2, 0, 0], face: false, centered: false }, [{ value: solid }])
  assert.equal(rawExtrude.value.builder.kind, 'prism')
  assert.equal(rawExtrude.value.builder.args[0], solid)
  assert.deepEqual(rawExtrude.value.builder.args[1].args, [2, 0, 0])

  const byExtrude = kernel.extrude({ by: [1, 2, 3], centered: false }, [{ value: solid }])
  assert.deepEqual(byExtrude.value.builder.args[1].args, [1, 2, 3])

  const zeroDirectionExtrude = kernel.extrude({ direction: '0 0 0', centered: false }, [sketch])
  assert.deepEqual(zeroDirectionExtrude.value.builder.args[1].args, [0, 0, 1])

  const revolved = kernel.revolve({ angle: 180, axis: '0 1 0', origin: '1 2 3' }, [sketch])
  assert.equal(revolved.tag, 'sol-revolve')
  assert.equal(revolved.value.builder.kind, 'revol')
  assert.equal(revolved.value.builder.args[2], Math.PI)
  assert.deepEqual(revolved.value.builder.args[1].direction.args, [0, 1, 0])

  const swept = kernel.sweep({}, [sketch, path])
  assert.equal(swept.tag, 'sol-sweep')
  assert.equal(swept.value.builder.kind, 'pipe')
  assert.equal(swept.value.builder.args[0].kind, 'cast-wire')
  assert.equal(swept.value.builder.args[1].builder.kind, 'face-builder')

  const sweptFirst = kernel.sweep({ path: 'first', face: false }, [path, sketch])
  assert.equal(sweptFirst.value.builder.args[0].source, path.value)
  assert.equal(sweptFirst.value.builder.args[1], sketch.value)

  const sweptIndex = kernel.sweep({ path: 0, face: false }, [path, sketch])
  assert.equal(sweptIndex.value.builder.args[0].source, path.value)

  const sweptStringIndex = kernel.sweep({ path: '1', face: false }, [path, sketch])
  assert.equal(sweptStringIndex.value.builder.args[0].source, sketch.value)

  const singleSweep = kernel.sweep({}, [sketch])
  assert.equal(singleSweep.value, sketch.value)

  assert.equal(kernel.face({}, []).value, null)
  assert.equal(kernel.extrude({}, []).value, null)
  assert.equal(kernel.revolve({}, []).value, null)
  assert.equal(kernel.sweep({}, []).value, null)
})

it('builds OpenCascade offset, shell, section, and import features', () => {
  const { openCascade, solidShape } = createFakeOpenCascade()
  const kernel = createOpenCascadeAdapter(openCascade)
  const { value } = solidShape(0, 3)

  const offset = kernel.offset({ distance: 2, mode: 'pipe', join: 'tangent', removeInternalEdges: true }, [{ value }])
  assert.equal(offset.tag, 'sol-offset')
  assert.equal(offset.value.builder.kind, 'offset-shape')
  assert.equal(offset.value.builder.perform[0], value)
  assert.equal(offset.value.builder.perform[1], 2)
  assert.equal(offset.value.builder.perform[3], 'offset-pipe')
  assert.equal(offset.value.builder.perform[6], 'join-tangent')
  assert.equal(offset.value.builder.perform[7], true)

  const shell = kernel.shell({ thickness: 3, faces: [1] }, [{ value }])
  assert.equal(shell.tag, 'sol-shell')
  assert.equal(shell.value.builder.kind, 'thick-solid')
  assert.equal(shell.value.builder.thick[1].items.length, 1)
  assert.equal(shell.value.builder.thick[1].items[0].source, value.faces[1])

  const closedShell = kernel.shell({}, [{ value }])
  assert.equal(closedShell.value.builder.thick[1].items.length, 0)
  assert.equal(closedShell.value.builder.thick[3], 0.001)
  assert.equal(closedShell.value.builder.thick[4], 'offset-skin')
  assert.equal(closedShell.value.builder.thick[7], 'join-arc')

  const allFacesShell = kernel.shell({ faces: true }, [{ value }])
  assert.equal(allFacesShell.value.builder.thick[1].items.length, 3)

  const section = kernel.section({ point: '1 2 3', direction: '0 1 0' }, [{ value }])
  assert.equal(section.tag, 'sol-section')
  assert.equal(section.value.builder.kind, 'section')
  assert.equal(section.value.builder.built, true)
  assert.deepEqual(section.value.builder.args[1].origin.args, [1, 2, 3])
  assert.deepEqual(section.value.builder.args[1].direction.args, [0, 1, 0])

  const normalSection = kernel.section({ normal: '1 0 0' }, [{ value }])
  assert.deepEqual(normalSection.value.builder.args[1].direction.args, [1, 0, 0])

  assert.equal(kernel.offset({}, []).value, null)
  assert.equal(kernel.shell({}, []).value, null)
  assert.equal(kernel.section({}, []).value, null)

  const step = kernel.step({ data: 'step-data' })
  assert.equal(step.tag, 'sol-step')
  assert.equal(step.value.kind, 'step:shape')
  assert.deepEqual(openCascade.FS.files['/solidark-import.step'], undefined)

  const stl = kernel.stl({ content: 'solid data' })
  assert.equal(stl.tag, 'sol-stl')
  assert.equal(stl.value.import.path, '/solidark-import.stl')
  assert.equal(stl.value.import.kind, 'stl')

  const brep = kernel.brep({ text: 'brep data' })
  assert.equal(brep.tag, 'sol-brep')
  assert.equal(brep.value.import.path, '/solidark-import.brep')
  assert.equal(brep.value.import.kind, 'brep')
})

it('supports OpenCascade advanced feature fallback bindings', () => {
  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const sketch = kernel.sketch({}, [
      kernel.move({ point: [0, 0] }),
      kernel.line({ point: [1, 0] })
    ])

    delete openCascade.TopoDS.Wire_1
    openCascade.BRepBuilderAPI_MakeFace_15 = class ShapeOnlyFaceBuilder {
      constructor (...args) {
        this.kind = 'shape-only-face'
        this.args = args
      }

      Shape () {
        return { kind: 'shape-only-face:shape', builder: this }
      }
    }

    const face = kernel.face({}, [sketch])
    assert.equal(face.value.kind, 'shape-only-face:shape')
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const sketch = kernel.sketch({}, [
      kernel.move({ point: [0, 0] }),
      kernel.line({ point: [1, 0] })
    ])

    delete openCascade.BRepBuilderAPI_MakeFace_15
    assert.throws(
      () => kernel.face({}, [sketch]),
      /MakeFace/
    )
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape()

    delete openCascade.BRepBuilderAPI_MakeFace_15
    assert.throws(
      () => kernel.extrude({ strict: true }, [{ value }]),
      /MakeFace/
    )
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape(0, 1)

    openCascade.TopTools_ListOfShape = class AppendOnlyShapeList {
      constructor () {
        this.items = []
      }

      Append (entry) {
        this.items.push(entry)
      }
    }

    const shell = kernel.shell({ faces: '0' }, [{ value }])
    assert.equal(shell.value.builder.thick[1].items.length, 1)
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape(0, 1)

    openCascade.TopTools_ListOfShape = class BrokenShapeList {}
    assert.throws(
      () => kernel.shell({ faces: true }, [{ value }]),
      /does not support Append/
    )
  }

  {
    const { openCascade, solidShape } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)
    const { value } = solidShape()

    delete openCascade.BRepOffset_Mode
    delete openCascade.GeomAbs_JoinType
    const offset = kernel.offset({ mode: 'missing', join: 'missing' }, [{ value }])
    assert.equal(offset.value.builder.perform[3], 0)
    assert.equal(offset.value.builder.perform[6], 0)
  }
})

it('supports OpenCascade importer fallback bindings', () => {
  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)

    openCascade.STEPControl_Reader_1 = class RootStepReader {
      ReadFile (path) {
        this.path = path
      }

      NbRootsForTransfer () {
        return 2
      }

      TransferRoot (index) {
        this.lastRoot = index
      }

      Shape (index) {
        return { kind: 'step:fallback-shape', index, path: this.path }
      }
    }

    const step = kernel.step({ path: '/model.step' })
    assert.equal(step.value.kind, 'step:fallback-shape')
    assert.equal(step.value.path, '/model.step')
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)

    openCascade.STEPControl_Reader_1 = class SingleRootStepReader {
      ReadFile (path) {
        this.path = path
      }

      TransferRoot (index) {
        this.lastRoot = index
      }

      Shape (index) {
        return { kind: 'step:single-root', index, lastRoot: this.lastRoot, path: this.path }
      }
    }

    const step = kernel.step({ path: '/single.step' })
    assert.equal(step.value.kind, 'step:single-root')
    assert.equal(step.value.lastRoot, 1)
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)

    openCascade.STEPControl_Reader_1 = class BrokenStepReader {
      ReadFile () {}
      TransferRoots () {}
    }
    assert.throws(
      () => kernel.step({ path: '/broken.step' }),
      /transferred shape/
    )
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)

    openCascade.BRepTools = {
      Read_1 (shape, path, builder) {
        shape.import = { kind: 'brep-read-1', path, builder }
      }
    }

    const brep = kernel.brep({ path: '/model.brep' })
    assert.equal(brep.value.import.kind, 'brep-read-1')
  }

  {
    const { openCascade } = createFakeOpenCascade()
    const kernel = createOpenCascadeAdapter(openCascade)

    delete openCascade.BRepTools
    assert.throws(
      () => kernel.brep({ path: '/broken.brep' }),
      /BRepTools\.Read/
    )
  }
})

it('surfaces unsupported OpenCascade advanced feature inputs', () => {
  const { openCascade } = createFakeOpenCascade({ fileSystem: false })
  const kernel = createOpenCascadeAdapter(openCascade)

  assert.throws(
    () => kernel.step({ data: 'inline' }),
    /virtual file system/
  )
  assert.throws(
    () => kernel.stl({}),
    /sol-stl requires/
  )
  assert.throws(
    () => kernel.brep({ data: 'brep' }),
    /virtual file system/
  )
})

function createFakeOpenCascade ({
  booleanArity = null,
  edgeShapeMethod = 'Edge',
  featureAddMethod = 'Add_2',
  featureBuildError = false,
  fileSystem = true,
  shapeMethod = true,
  translationMethod = 'SetTranslation_1',
  rotationMethod = 'SetRotation_1',
  faceCast = true,
  locationTransformation = true,
  loftAddWireMethod = 'AddWire',
  loftArity = null,
  loftBuildArity = null,
  loftBuildMethod = 'Build',
  meshPurposeEnum = true,
  shapeEnum = true,
  progressRange = true,
  triangulationTool = true,
  triangulationArity = 3,
  wireAddMethod = 'Add',
  wireShapeMethod = 'Wire',
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

  class Direction extends Handle {
    constructor (...args) {
      super('gp_Dir', args)
    }
  }

  class Axis extends Handle {
    constructor (origin, direction) {
      super('gp_Ax1', [origin, direction])
      this.origin = origin
      this.direction = direction
    }
  }

  class Axis2 extends Handle {
    constructor (origin, direction) {
      super('gp_Ax2', [origin, direction])
      this.origin = origin
      this.direction = direction
    }
  }

  class Circle extends Handle {
    constructor (axis, radius) {
      super('gp_Circ', [axis, radius])
      this.axis = axis
      this.radius = radius
    }
  }

  class Transform extends Handle {
    constructor () {
      super('gp_Trsf')
    }

    SetScale (origin, factor) {
      this.scale = { origin, factor }
    }

    SetMirror_3 (plane) {
      this.mirrorPlane = plane
    }

    SetValues (...values) {
      this.values = values
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

  class EdgeBuilder extends Handle {
    constructor (...args) {
      super('edge', args)
    }

    Edge () {
      const edge = new Handle('edge:edge', this.args)
      edge.builder = this
      return edge
    }

    Shape () {
      const edge = new Handle('edge:shape', this.args)
      edge.builder = this
      return edge
    }
  }

  class FeatureBuilder extends Handle {
    constructor (kind, args) {
      super(kind, args)
      this.edges = []
      this.built = false
    }

    Add (amount, edge) {
      this.edges.push({ amount, edge, method: 'Add' })
    }

    Add_2 (amount, edge) {
      this.edges.push({ amount, edge, method: 'Add_2' })
    }

    Build () {
      if (featureBuildError) {
        throw new Error('feature exploded')
      }

      this.built = true
    }

    Shape () {
      const shape = new Handle(`${this.kind}:shape`, this.args)
      shape.builder = this
      shape.edges = this.edges.map((entry) => entry.edge)
      return shape
    }
  }

  class FilletBuilder extends FeatureBuilder {
    constructor (...args) {
      super('fillet-feature', args)
    }
  }

  class ChamferBuilder extends FeatureBuilder {
    constructor (...args) {
      super('chamfer-feature', args)
    }
  }

  class FaceBuilder extends Handle {
    constructor (...args) {
      super('face-builder', args)
    }

    Face () {
      const face = new Handle('face:face', this.args)
      face.builder = this
      return face
    }

    Shape () {
      const face = new Handle('face:shape', this.args)
      face.builder = this
      return face
    }
  }

  class PrismBuilder extends Handle {
    constructor (...args) {
      super('prism', args)
    }

    Shape () {
      const shape = new Handle('prism:shape', this.args)
      shape.builder = this
      return shape
    }
  }

  class RevolBuilder extends Handle {
    constructor (...args) {
      super('revol', args)
    }

    Shape () {
      const shape = new Handle('revol:shape', this.args)
      shape.builder = this
      return shape
    }
  }

  class PipeBuilder extends Handle {
    constructor (...args) {
      super('pipe', args)
    }

    Shape () {
      const shape = new Handle('pipe:shape', this.args)
      shape.builder = this
      return shape
    }
  }

  class OffsetShapeBuilder extends Handle {
    constructor (...args) {
      super('offset-shape', args)
    }

    PerformByJoin (...args) {
      this.perform = args
    }

    Shape () {
      const shape = new Handle('offset-shape:shape', this.args)
      shape.builder = this
      return shape
    }
  }

  class ThickSolidBuilder extends Handle {
    constructor (...args) {
      super('thick-solid', args)
    }

    MakeThickSolidByJoin (...args) {
      this.thick = args
    }

    Shape () {
      const shape = new Handle('thick-solid:shape', this.args)
      shape.builder = this
      return shape
    }
  }

  class SectionBuilder extends Handle {
    constructor (...args) {
      super('section', args)
      this.built = false
    }

    Build () {
      this.built = true
    }

    Shape () {
      const shape = new Handle('section:shape', this.args)
      shape.builder = this
      return shape
    }
  }

  class ShapeList extends Handle {
    constructor (...args) {
      super('shape-list', args)
      this.items = []
    }

    Append_1 (value) {
      this.items.push(value)
    }

    Append (value) {
      this.items.push(value)
    }
  }

  class Plane extends Handle {
    constructor (origin, direction) {
      super('plane', [origin, direction])
      this.origin = origin
      this.direction = direction
    }
  }

  class ImportedShape extends Handle {
    constructor (...args) {
      super('topods-shape', args)
    }
  }

  class StepReader extends Handle {
    constructor (...args) {
      super('step-reader', args)
    }

    ReadFile (path) {
      this.path = path
      return 'step-done'
    }

    TransferRoots () {
      this.transferred = true
      return 1
    }

    OneShape () {
      const shape = new Handle('step:shape', [this.path])
      shape.reader = this
      return shape
    }
  }

  class StlReader extends Handle {
    constructor (...args) {
      super('stl-reader', args)
    }

    Read (shape, path) {
      shape.import = { kind: 'stl', path }
      return true
    }
  }

  class BrepBuilder extends Handle {
    constructor (...args) {
      super('brep-builder', args)
    }
  }

  class WireBuilder extends Handle {
    constructor (...args) {
      super('wire', args)
      this.edges = []
    }

    Add (edge) {
      this.edges.push(edge)
    }

    Add_1 (edge) {
      this.edges.push(edge)
    }

    Wire () {
      const wire = new Handle('wire:wire', this.args)
      wire.builder = this
      wire.edges = this.edges
      return wire
    }

    Shape () {
      const wire = new Handle('wire:shape', this.args)
      wire.builder = this
      wire.edges = this.edges
      return wire
    }
  }

  class LoftBuilder extends Handle {
    constructor (...args) {
      if (loftArity === 'fatal-error') {
        throw new Error('loft exploded')
      }

      if (typeof loftArity === 'number' && args.length !== loftArity) {
        throw new Error(`BindingError: invalid number of parameters (${args.length}) - expected (${loftArity}) parameters instead!`)
      }

      super('loft', args)
      this.wires = []
      this.built = false
    }

    AddWire (wire) {
      this.wires.push(wire)
    }

    AddWire_1 (wire) {
      this.wires.push(wire)
    }

    Build (...args) {
      if (loftBuildArity === 'fatal-error') {
        throw new Error('loft build exploded')
      }

      if (typeof loftBuildArity === 'number' && args.length !== loftBuildArity) {
        throw new Error(`BindingError: invalid number of parameters (${args.length}) - expected (${loftBuildArity}) parameters instead!`)
      }

      this.buildArgs = args
      this.built = true
    }

    Shape () {
      const loft = new Handle('loft:shape', this.args)
      loft.builder = this
      loft.wires = this.wires
      return loft
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
      const shape = args[0]
      const target = args[1]

      this.items = target === 'edge-enum' || target === 'TopAbs_EDGE'
        ? shape.edges || []
        : shape.faces || []
      this.index = 0
    }

    More () {
      return this.index < this.items.length
    }

    Current () {
      return this.items[this.index]
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

  if (rotationMethod) {
    Transform.prototype[rotationMethod] = function setRotation (axis, radians) {
      this.rotation = { axis, radians }
      this.rotationMethod = rotationMethod
    }
  }

  if (edgeShapeMethod !== 'Edge') {
    EdgeBuilder.prototype.Edge = null
  }

  if (edgeShapeMethod !== 'Shape') {
    EdgeBuilder.prototype.Shape = null
  }

  if (featureAddMethod !== 'Add') {
    FeatureBuilder.prototype.Add = null
  }

  if (featureAddMethod !== 'Add_2') {
    FeatureBuilder.prototype.Add_2 = null
  }

  if (wireAddMethod !== 'Add') {
    WireBuilder.prototype.Add = null
  }

  if (wireAddMethod !== 'Add_1') {
    WireBuilder.prototype.Add_1 = null
  }

  if (wireShapeMethod !== 'Wire') {
    WireBuilder.prototype.Wire = null
  }

  if (wireShapeMethod !== 'Shape') {
    WireBuilder.prototype.Shape = null
  }

  if (loftAddWireMethod !== 'AddWire') {
    LoftBuilder.prototype.AddWire = null
  }

  if (loftAddWireMethod !== 'AddWire_1') {
    LoftBuilder.prototype.AddWire_1 = null
  }

  if (!loftBuildMethod) {
    LoftBuilder.prototype.Build = null
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
    BRepAlgoAPI_Common: createBooleanBuilderClass(Handle, 'common', shapeMethod, booleanArity),
    BRepAlgoAPI_Section_5: SectionBuilder,
    BRepBuilderAPI_MakeEdge: EdgeBuilder,
    BRepBuilderAPI_MakeEdge_8: EdgeBuilder,
    BRepBuilderAPI_MakeFace_15: FaceBuilder,
    BRepFilletAPI_MakeChamfer: ChamferBuilder,
    BRepFilletAPI_MakeFillet: FilletBuilder,
    BRepBuilderAPI_MakeWire: WireBuilder,
    BRepOffsetAPI_MakeOffsetShape: OffsetShapeBuilder,
    BRepOffsetAPI_MakeThickSolid: ThickSolidBuilder,
    BRepOffsetAPI_MakePipe_1: PipeBuilder,
    BRepOffsetAPI_ThruSections: LoftBuilder,
    BRepPrimAPI_MakePrism_1: PrismBuilder,
    BRepPrimAPI_MakeRevol_1: RevolBuilder,
    BRepMesh_IncrementalMesh: Mesher,
    BRep_Builder: BrepBuilder,
    TopExp_Explorer: Explorer,
    TopLoc_Location: Location,
    TopTools_ListOfShape: ShapeList,
    TopoDS_Shape: ImportedShape,
    STEPControl_Reader_1: StepReader,
    StlAPI_Reader: StlReader,
    gp_Pln_3: Plane,
    gp_Trsf: Transform,
    gp_Vec: Vector,
    gp_Pnt: Point,
    gp_Dir: Direction,
    gp_Ax1: Axis,
    gp_Ax2_3: Axis2,
    gp_Circ_2: Circle
  }

  if (progressRange) {
    openCascade.Message_ProgressRange_1 = createBuilderClass(Handle, 'progress', false)
  }

  if (shapeEnum) {
    openCascade.TopAbs_ShapeEnum = {
      TopAbs_EDGE: 'edge-enum',
      TopAbs_FACE: 'face-enum',
      TopAbs_SHAPE: 'shape-enum'
    }
  }

  if (meshPurposeEnum) {
    openCascade.Poly_MeshPurpose = {
      Poly_MeshPurpose_NONE: 'mesh-purpose'
    }
  }

  openCascade.BRepOffset_Mode = {
    BRepOffset_Pipe: 'offset-pipe',
    BRepOffset_RectoVerso: 'offset-recto-verso',
    BRepOffset_Skin: 'offset-skin'
  }

  openCascade.GeomAbs_JoinType = {
    GeomAbs_Arc: 'join-arc',
    GeomAbs_Intersection: 'join-intersection',
    GeomAbs_Tangent: 'join-tangent'
  }

  openCascade.BRepTools = {
    Read_2 (shape, path, builder) {
      shape.import = { kind: 'brep', path, builder }
      return true
    }
  }

  if (fileSystem) {
    openCascade.FS = {
      files: {},
      writeFile (path, content) {
        this.files[path] = content
      },
      unlink (path) {
        delete this.files[path]
      }
    }
  }

  openCascade.TopoDS = {
    Edge_1 (current) {
      const edge = new Handle('cast-edge', [current])
      edge.source = current
      return edge
    },

    Wire_1 (current) {
      const wire = new Handle('cast-wire', [current])
      wire.source = current
      return wire
    }
  }

  if (faceCast) {
    openCascade.TopoDS.Face_1 = function face (current) {
      const castFace = new Face(current.triangulation, [current])
      castFace.source = current
      return castFace
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

  function solidShape (edgeCount = 0, faceCount = 0) {
    const value = new Handle('shape')

    value.edges = Array.from({ length: edgeCount }, (_, index) => {
      const edge = new Handle('edge-shape', [index])
      edge.index = index
      return edge
    })
    value.faces = Array.from({ length: faceCount }, (_, index) => {
      const face = new Face(null, [index])
      face.index = index
      return face
    })

    return { edges: value.edges, faces: value.faces, value }
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
    openCascade,
    solidShape
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
