import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../dom.js'
import { SolidarkRuntime } from '../runtime/index.js'
import { Component } from './component.js'
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
  static kernelMethod = 'part'
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

it('Component evaluates kernel-backed nodes through its own kernel method', () => {
  const kernel = {
    part (properties, children) {
      return { tag: 'kernel-part', properties, children }
    }
  }

  setGlobalKernel(kernel)

  try {
    const [shape] = KernelPart.evaluateNode({
      properties: { width: 2 }
    }, ['child'])

    assert.deepEqual(shape, {
      tag: 'kernel-part',
      properties: { width: 2 },
      children: ['child']
    })

    const [defaultShape] = KernelPart.evaluateNode({}, [])

    assert.deepEqual(defaultShape, {
      tag: 'kernel-part',
      properties: {},
      children: []
    })
  } finally {
    clearGlobalKernel()
  }
})

it('Component passes through evaluated children when it has no kernel method', () => {
  assert.deepEqual(Component.evaluateNode({}, ['child']), ['child'])
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
      /Kernel does not implement part\(\) for kernel-part/
    )
  } finally {
    clearGlobalKernel()
  }
})
