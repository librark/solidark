import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../dom.js'
import { SolidarkRuntime } from '../runtime/index.js'
import { Component, SolidarkChildGeometryError } from './component.js'
import { clearGlobalKernel, createInMemoryKernel, setGlobalKernel } from './kernel/index.js'

class ChainPart extends Component {
  static tag = 'chain-part'
  static defaultProperties = { width: 1 }
  static observedAttributes = ['width']

  render () {
    this.content = `<child-part value="${this.properties.width}"></child-part>`
    return this
  }
}

class KernelPart extends Component {
  static tag = 'kernel-part'
  static category = 'primitive'
  static geometryKind = 'solid'

  static build (properties, children, kernel) {
    return kernel.part(properties, children)
  }
}

class FeaturePart extends Component {
  static tag = 'feature-part'
  static category = 'feature'
  static geometryKind = 'solid'

  static build (properties, children, kernel) {
    return kernel.part(properties, children)
  }
}

it('Component.define registers and returns the class', () => {
  assert.equal(ChainPart.define(), ChainPart)
  assert.equal(ChainPart.define('chain-part-alias'), ChainPart)
})

it('Component reads defaults, attributes, and assigned properties', () => {
  const part = new ChainPart()
  part.setAttribute('height', '2')
  part.init({ width: 3 })

  assert.equal(part.properties.width, 3)
  assert.equal(part.properties.height, 2)
})

it('Component reads browser-style attribute collections', () => {
  const part = new ChainPart()
  part.attributes = [{ name: 'major-radius', value: '5' }]

  assert.equal(part.properties.majorRadius, 5)
})

it('Component handles missing attribute collections and default init', () => {
  const part = new ChainPart()
  part.attributes = undefined

  assert.equal(part.init(), part)
  assert.equal(part.properties.width, 1)
})

it('Component content sets innerHTML and schedules updates', async () => {
  const part = new ChainPart()

  part.content = '<child-part enabled></child-part>'
  await part.updated

  assert.equal(part.content, '<child-part enabled></child-part>')
  assert.equal(part.children[0].localName, 'child-part')
})

it('Component lifecycle methods schedule rendering and return this', async () => {
  const part = new ChainPart()

  assert.equal(part.connectedCallback(), part)
  await part.rendered
  await part.updated

  assert.equal(part.children[0].getAttribute('value'), '1')
  assert.equal(part.attributeChangedCallback(), part)
  assert.equal(part.scheduleRender(), part.rendered)
  assert.equal(part.scheduleUpdate(), part.updated)
})

it('Component excludes reserved and internal fields from properties', () => {
  const part = new ChainPart()
  part._internal = 'hidden'
  part.ready = 'hidden'
  part.visible = 'shown'

  assert.equal(part.properties.visible, 'shown')
  assert.equal('ready' in part.properties, false)
  assert.equal('_internal' in part.properties, false)
})

it('Component load and evaluate delegate to the runtime', async () => {
  SolidarkRuntime.resetForTests()
  const part = parseMarkup('<chain-part width="4"></chain-part>')[0]

  assert.equal(await part.load(), SolidarkRuntime.kernel)
  const result = await part.evaluate()

  assert.equal(result.element, part)
  assert.equal(result.model.tag, 'chain-part')
})

it('Component reads the active global kernel', () => {
  const kernel = createInMemoryKernel()

  setGlobalKernel(kernel)

  try {
    assert.equal(KernelPart.kernel, kernel)
    assert.equal(new KernelPart().kernel, kernel)
  } finally {
    clearGlobalKernel()
  }
})

it('Component evaluates kernel-backed nodes through its own shape builder', () => {
  const kernel = {
    part (properties, children) {
      return { properties, children }
    }
  }

  setGlobalKernel(kernel)

  try {
    const [shape] = KernelPart.evaluateNode({
      properties: { width: 2 }
    }, ['child'])

    assert.deepEqual(shape, {
      method: 'kernel-part',
      category: 'primitive',
      tag: 'kernel-part',
      geometryKind: 'solid',
      properties: { width: 2 },
      children: ['child']
    })

    const [defaultShape] = KernelPart.evaluateNode({}, [])

    assert.deepEqual(defaultShape, {
      method: 'kernel-part',
      category: 'primitive',
      tag: 'kernel-part',
      geometryKind: 'solid',
      properties: {},
      children: []
    })
  } finally {
    clearGlobalKernel()
  }
})

it('Component decorates direct styling properties on kernel shapes', () => {
  const kernel = {
    part (properties, children) {
      return { properties, children }
    }
  }

  setGlobalKernel(kernel)

  try {
    const [colorShape] = KernelPart.evaluateNode({
      properties: { color: '#336699' }
    }, [])
    const [colourShape] = KernelPart.evaluateNode({
      properties: { colour: 'tomato' }
    }, [])
    const preservedShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      properties: { color: '#112233' },
      styling: { material: 'painted' }
    })
    const inheritedShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      properties: {},
      children: [{ styling: { color: 'blue' } }]
    })
    const sameChildStylingShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      properties: {},
      children: [{ styling: { color: 'blue' } }, { styling: { color: 'blue' } }]
    })
    const partialChildStylingShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      properties: {},
      children: [{ styling: { color: 'blue' } }, {}]
    })
    const featureChildStylingShape = FeaturePart.decorateKernelShape({
      tag: 'feature-part',
      properties: {},
      children: [{ styling: { color: 'blue' } }, {}]
    })
    const arrayChildStylingShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      properties: {},
      children: [{ styling: { color: [0, 0, 1] } }, { styling: { color: [0, 0, 1] } }]
    })
    const multiChildShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      properties: {},
      children: [{ styling: { color: 'blue' } }, { styling: { color: 'red' } }]
    })
    const existingGeometryShape = KernelPart.decorateKernelShape({
      tag: 'kernel-part',
      geometryKind: 'surface',
      properties: {},
      children: []
    })
    const nullGeometryShape = Component.decorateKernelShape({
      tag: 'component-part',
      properties: {},
      children: []
    })

    assert.deepEqual(colorShape.styling, { color: '#336699' })
    assert.deepEqual(colourShape.styling, { color: 'tomato' })
    assert.deepEqual(preservedShape.styling, { material: 'painted', color: '#112233' })
    assert.deepEqual(inheritedShape.styling, { color: 'blue' })
    assert.deepEqual(sameChildStylingShape.styling, { color: 'blue' })
    assert.equal('styling' in partialChildStylingShape, false)
    assert.deepEqual(featureChildStylingShape.styling, { color: 'blue' })
    assert.deepEqual(arrayChildStylingShape.styling, { color: [0, 0, 1] })
    assert.equal('styling' in multiChildShape, false)
    assert.equal(existingGeometryShape.geometryKind, 'surface')
    assert.equal('geometryKind' in nullGeometryShape, false)
    assert.equal(Component.decorateKernelShape(null), null)
  } finally {
    clearGlobalKernel()
  }
})

it('Component passes through evaluated children when it has no shape builder', () => {
  assert.deepEqual(Component.evaluateNode({}, ['child']), ['child'])
  assert.equal(Component.build(), null)
})

it('Component reports missing global kernel implementations', () => {
  clearGlobalKernel()

  assert.throws(
    () => KernelPart.evaluateNode({ properties: {} }, []),
    /kernel is not loaded/
  )

  setGlobalKernel({})

  try {
    assert.throws(
      () => KernelPart.evaluateNode({ properties: {} }, []),
      /kernel\.part is not a function/
    )
  } finally {
    clearGlobalKernel()
  }
})

it('Component validates accepted child geometry kinds', () => {
  const solidChild = { tag: 'solid-child', geometryKind: 'solid' }
  const sketchChild = { tag: 'sketch-child', geometryKind: 'sketch' }

  assert.equal(FeaturePart.validateChildGeometry([solidChild], ['solid']), FeaturePart)
  assert.equal(FeaturePart.validateChildGeometry([solidChild], 'solid'), FeaturePart)
  assert.equal(FeaturePart.validateChildGeometry([{ tag: 'brep-child', geometryKind: 'assembly' }], ['brep']), FeaturePart)
  assert.equal(FeaturePart.validateChildGeometry([sketchChild], null), FeaturePart)
  assert.equal(KernelPart.childGeometryKindsForValidation().length, 0)

  assert.throws(
    () => FeaturePart.validateChildGeometry([sketchChild], ['solid']),
    (error) => {
      assert.equal(error instanceof SolidarkChildGeometryError, true)
      assert.equal(error.componentTag, 'feature-part')
      assert.equal(error.childTag, 'sketch-child')
      assert.equal(error.childGeometryKind, 'sketch')
      assert.deepEqual(error.allowedGeometryKinds, ['solid'])
      assert.match(error.message, /feature-part does not accept sketch geometry/)
      return true
    }
  )

  assert.throws(
    () => KernelPart.validateChildGeometry([solidChild]),
    /expected no geometry children/
  )

  assert.throws(
    () => FeaturePart.validateChildGeometry([{ tag: 'mesh-child', geometryKind: 'mesh' }], ['brep']),
    /expected brep/
  )

  assert.throws(
    () => FeaturePart.validateChildGeometry([{ method: 'method-child' }], ['solid']),
    (error) => {
      assert.equal(error.childTag, 'method-child')
      assert.equal(error.childGeometryKind, 'unknown')
      return true
    }
  )

  assert.throws(
    () => FeaturePart.validateChildGeometry([{}], ['solid']),
    /from child/
  )
})
