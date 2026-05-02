import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Component } from '../base/index.js'
import { parseMarkup } from '../dom.js'
import { defineSolidarkElements } from '../elements.js'
import { normalizeElement } from '../normalize.js'
import { SolidarkEvaluationError, errorMessage, evaluateNode } from './evaluate.js'
import { clearGlobalKernel, setGlobalKernel, useInMemoryKernel } from './kernel/global.js'
import { createInMemoryKernel } from '../base/kernel/index.js'

defineSolidarkElements()

class CustomKernelComponent extends Component {
  static tag = 'test-kernel-node'
  static category = 'primitive'
  static geometryKind = 'solid'

  static build (properties, children, kernel) {
    return kernel.custom(properties, children)
  }
}

CustomKernelComponent.define()
useInMemoryKernel()

it('evaluateNode implicitly unions model children', () => {
  const [model] = parseMarkup(`
    <sol-model color="#336699">
      <sol-cuboid size="1 1 1"></sol-cuboid>
      <sol-sphere radius="2"></sol-sphere>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model))

  assert.equal(shape.tag, 'sol-union')
  assert.equal(shape.properties.implicit, true)
  assert.equal(shape.properties.color, '#336699')
  assert.deepEqual(shape.styling, { color: '#336699' })
  assert.equal(shape.children.length, 2)
})

it('evaluateNode evaluates transform, operation, feature, and external nodes', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-fillet radius="2">
        <sol-translate by="1 0 0">
          <sol-difference>
            <sol-cuboid size="2 2 2"></sol-cuboid>
            <sol-cylinder radius="1" height="3"></sol-cylinder>
          </sol-difference>
        </sol-translate>
      </sol-fillet>
      <sol-stl src="part.stl"></sol-stl>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model))

  assert.equal(shape.tag, 'sol-union')
  assert.equal(shape.children[0].category, 'feature')
  assert.equal(shape.children[0].children[0].category, 'transform')
  assert.equal(shape.children[1].category, 'external')
})

it('evaluateNode evaluates sketches and sketch actions explicitly', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-loft>
        <sol-sketch>
          <sol-move point="0 0"></sol-move>
          <sol-line point="1 0"></sol-line>
          <sol-close></sol-close>
        </sol-sketch>
        <sol-translate by="0 0 10">
          <sol-sketch>
            <sol-move point="0 0"></sol-move>
            <sol-line point="2 0"></sol-line>
            <sol-close></sol-close>
          </sol-sketch>
        </sol-translate>
      </sol-loft>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model))

  assert.equal(shape.tag, 'sol-loft')
  assert.equal(shape.children[0].tag, 'sol-sketch')
  assert.equal(shape.children[0].category, 'sketch')
  assert.equal(shape.children[1].tag, 'sol-translate')
  assert.equal(shape.children[1].geometryKind, 'sketch')
  assert.deepEqual(shape.children[0].children.map((child) => child.category), ['sketch', 'sketch', 'sketch'])
  assert.deepEqual(shape.children[0].children.map((child) => child.tag), ['sol-move', 'sol-line', 'sol-close'])
})

it('evaluateNode applies sol-color transparently inside feature inputs', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-sweep>
        <sol-color value="#ff0000">
          <sol-rectangle size="8 8"></sol-rectangle>
        </sol-color>
        <sol-sketch>
          <sol-move point="0 0 0"></sol-move>
          <sol-line point="10 0 0"></sol-line>
        </sol-sketch>
      </sol-sweep>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model), createInMemoryKernel())

  assert.equal(shape.tag, 'sol-sweep')
  assert.equal(shape.children[0].tag, 'sol-rectangle')
  assert.deepEqual(shape.children[0].styling, { color: '#ff0000' })
  assert.deepEqual(shape.styling, { color: '#ff0000' })
})

it('evaluateNode keeps partial operation child styling local', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-union>
        <sol-color value="#ff0000">
          <sol-cuboid size="2 2 2"></sol-cuboid>
        </sol-color>
        <sol-sphere radius="1"></sol-sphere>
      </sol-union>
    </sol-model>
  `)
  const [shape] = evaluateNode(normalizeElement(model), createInMemoryKernel())
  const [coloredChild, plainChild] = shape.children

  assert.equal(shape.tag, 'sol-union')
  assert.equal('styling' in shape, false)
  assert.equal(coloredChild.tag, 'sol-cuboid')
  assert.deepEqual(coloredChild.styling, { color: '#ff0000' })
  assert.equal(plainChild.tag, 'sol-sphere')
  assert.equal('styling' in plainChild, false)
})

it('evaluateNode returns no shapes for an empty model', () => {
  const [model] = parseMarkup('<sol-model></sol-model>')

  assert.deepEqual(evaluateNode(normalizeElement(model), createInMemoryKernel()), [])
})

it('evaluateNode passes through unsupported component nodes', () => {
  assert.deepEqual(
    evaluateNode({
      tag: 'custom-wrapper',
      category: 'component',
      geometryKind: null,
      properties: {},
      implicitUnion: false,
      children: []
    }),
    []
  )
})

it('evaluateNode delegates kernel-backed behavior to the component class', () => {
  setGlobalKernel({
    custom (properties, children) {
      return {
        properties,
        children
      }
    }
  })

  try {
    const [shape] = evaluateNode({
      tag: 'test-kernel-node',
      category: 'primitive',
      geometryKind: 'solid',
      properties: { value: 3 },
      implicitUnion: false,
      children: []
    })

    assert.deepEqual(shape, {
      method: 'test-kernel-node',
      category: 'primitive',
      tag: 'test-kernel-node',
      geometryKind: 'solid',
      properties: { value: 3 },
      children: []
    })
  } finally {
    clearGlobalKernel()
    useInMemoryKernel()
  }
})

it('evaluateNode wraps kernel failures with component diagnostics', () => {
  const kernel = createInMemoryKernel()
  const [model] = parseMarkup(`
    <sol-model>
      <sol-translate by="1 0 0">
        <sol-cuboid size="2 2 2"></sol-cuboid>
      </sol-translate>
    </sol-model>
  `)

  kernel.cuboid = () => {
    throw new TypeError('OpenCascade binding not found: BRepPrimAPI_MakeBox')
  }

  assert.throws(
    () => evaluateNode(normalizeElement(model), kernel),
    (error) => {
      assert.equal(error instanceof SolidarkEvaluationError, true)
      assert.match(error.message, /Failed to evaluate sol-cuboid/)
      assert.equal(error.diagnostic.level, 'error')
      assert.equal(error.diagnostic.stage, 'evaluate')
      assert.equal(error.diagnostic.tag, 'sol-cuboid')
      assert.equal(error.diagnostic.method, 'cuboid')
      assert.equal(error.diagnostic.path, 'sol-model > sol-translate[0] > sol-cuboid[0]')
      assert.equal(error.diagnostic.category, 'primitive')
      assert.equal(error.diagnostic.errorCategory, 'kernel-operation-failure')
      assert.equal(error.diagnostic.suggestion, 'Check the component inputs and underlying kernel support for this operation.')
      assert.deepEqual(error.diagnostic.properties.size, [2, 2, 2])
      assert.equal(error.diagnostic.cause, 'OpenCascade binding not found: BRepPrimAPI_MakeBox')
      assert.equal(error.cause instanceof TypeError, true)
      assert.deepEqual(error.diagnostics, [error.diagnostic])
      return true
    }
  )
})

it('evaluateNode classifies invalid properties and kernel load failures', () => {
  const invalidKernel = createInMemoryKernel()
  const [invalidModel] = parseMarkup('<sol-model><sol-cuboid size="0 1 1"></sol-cuboid></sol-model>')

  invalidKernel.cuboid = () => {
    throw new RangeError('size must be a positive finite number')
  }

  assert.throws(
    () => evaluateNode(normalizeElement(invalidModel), invalidKernel),
    (error) => {
      assert.equal(error.diagnostic.errorCategory, 'invalid-properties')
      assert.equal(error.diagnostic.suggestion, 'Check this component\'s numeric attributes and use finite values in the supported range.')
      return true
    }
  )

  const loadKernel = createInMemoryKernel()
  const [loadModel] = parseMarkup('<sol-model><sol-sphere radius="1"></sol-sphere></sol-model>')

  loadKernel.sphere = () => {
    throw new TypeError('opencascade.js must export initOpenCascade or a default factory')
  }

  assert.throws(
    () => evaluateNode(normalizeElement(loadModel), loadKernel),
    (error) => {
      assert.equal(error.diagnostic.errorCategory, 'kernel-load-failure')
      assert.equal(error.diagnostic.suggestion, 'Verify the OpenCascade.js import map, WASM path, and configured kernel loader.')
      return true
    }
  )
})

it('evaluateNode classifies invalid child geometry', () => {
  const [model] = parseMarkup(`
    <sol-model>
      <sol-extrude>
        <sol-cuboid size="1 1 1"></sol-cuboid>
      </sol-extrude>
    </sol-model>
  `)

  assert.throws(
    () => evaluateNode(normalizeElement(model), createInMemoryKernel()),
    (error) => {
      assert.equal(error instanceof SolidarkEvaluationError, true)
      assert.equal(error.diagnostic.tag, 'sol-extrude')
      assert.equal(error.diagnostic.errorCategory, 'invalid-child-geometry-kind')
      assert.equal(error.diagnostic.suggestion, 'Check that this component only wraps compatible child geometry.')
      assert.match(error.diagnostic.cause, /sol-extrude does not accept solid geometry from sol-cuboid/)
      return true
    }
  )
})

it('evaluateNode reports model-level kernel method diagnostics', () => {
  const kernel = createInMemoryKernel()
  const [model] = parseMarkup(`
    <sol-model>
      <sol-cuboid size="2 2 2"></sol-cuboid>
      <sol-sphere radius="1"></sol-sphere>
    </sol-model>
  `)

  kernel.union = () => {
    throw new Error('union failed')
  }

  assert.throws(
    () => evaluateNode(normalizeElement(model), kernel),
    (error) => {
      assert.equal(error instanceof SolidarkEvaluationError, true)
      assert.equal(error.diagnostic.tag, 'sol-model')
      assert.equal(error.diagnostic.method, 'union')
      assert.equal(error.diagnostic.path, 'sol-model')
      assert.equal(error.diagnostic.cause, 'union failed')
      assert.equal(error.cause instanceof Error, true)
      return true
    }
  )
  assert.equal(errorMessage('plain failure'), 'plain failure')
})

it('evaluateNode preserves existing evaluation diagnostics', () => {
  const diagnostic = {
    cause: 'already wrapped',
    level: 'error',
    method: 'custom',
    path: 'test-kernel-node',
    properties: {},
    stage: 'evaluate',
    tag: 'test-kernel-node'
  }
  const expected = new SolidarkEvaluationError(diagnostic, new Error('already wrapped'))

  setGlobalKernel({
    custom () {
      throw expected
    }
  })

  try {
    assert.throws(
      () => evaluateNode({
        tag: 'test-kernel-node',
        category: 'primitive',
        geometryKind: 'solid',
        properties: {},
        implicitUnion: false,
        children: []
      }),
      (error) => {
        assert.equal(error, expected)
        return true
      }
    )
  } finally {
    clearGlobalKernel()
    useInMemoryKernel()
  }
})
