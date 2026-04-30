import assert from 'node:assert/strict'
import { it } from 'node:test'

import { Component } from './component.js'
import { parseMarkup } from './dom.js'
import { SolidarkRuntime } from './runtime.js'

class ChainPart extends Component {
  static tag = 'chain-part'
  static defaultProperties = { width: 1 }
  static observedAttributes = ['width']

  render () {
    this.content = `<child-part value="${this.properties.width}"></child-part>`
    return this
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
