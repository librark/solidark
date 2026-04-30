import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  constructOpenCascadeBinding,
  createOpenCascadeAdapter,
  createOpenCascadeKernel,
  loadOpenCascade
} from './opencascade.js'

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
  const union = kernel.union({}, [first, second, third])

  kernel.dispose(union)

  assert.equal(handles.every((handle) => handle.deleted), true)
})

function createFakeOpenCascade ({
  shapeMethod = true,
  translationMethod = 'SetTranslation_1'
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

  if (translationMethod) {
    Transform.prototype[translationMethod] = function setTranslation (offset) {
      this.translation = offset
      this.translationMethod = translationMethod
    }
  }

  return {
    handles,
    openCascade: {
      BRepPrimAPI_MakeBox: createBuilderClass(Handle, 'box', shapeMethod),
      BRepPrimAPI_MakeSphere: createBuilderClass(Handle, 'sphere', shapeMethod),
      BRepPrimAPI_MakeCylinder: createBuilderClass(Handle, 'cylinder', shapeMethod),
      BRepBuilderAPI_Transform: createBuilderClass(Handle, 'transform', shapeMethod),
      BRepAlgoAPI_Fuse: createBuilderClass(Handle, 'fuse', shapeMethod),
      BRepAlgoAPI_Cut: createBuilderClass(Handle, 'cut', shapeMethod),
      Message_ProgressRange_1: createBuilderClass(Handle, 'progress', false),
      gp_Trsf: Transform,
      gp_Vec: Vector
    }
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
