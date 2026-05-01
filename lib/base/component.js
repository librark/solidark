import { HTMLElementBase, defineElement } from '../dom.js'
import { SolidarkRuntime } from '../runtime/index.js'
import { getGlobalKernel } from './kernel/index.js'
import { camelCase, parseAttributeValue } from './utils.js'

const RESERVED_KEYS = new Set([
  'attributes',
  'childNodes',
  'localName',
  'parentNode',
  'ready',
  'rendered',
  'updated'
])

/**
 * Base class for every Solidark component.
 */
export class Component extends HTMLElementBase {
  static tag = ''
  static category = 'component'
  static geometryKind = null
  static defaultProperties = {}
  static observedAttributes = []
  static kernelMethod = null

  constructor () {
    super()
    this.initializeInternals()
  }

  static define (tag = this.tag) {
    defineElement(tag, this)
    return this
  }

  static get kernel () {
    return getGlobalKernel()
  }

  static evaluateNode (node, children, kernel = this.kernel) {
    if (!this.kernelMethod) {
      return children
    }

    return [this.createKernelShape(node.properties || {}, children, kernel)]
  }

  static createKernelShape (properties = {}, children = [], kernel = this.kernel) {
    const method = this.kernelMethod

    if (!kernel) {
      throw new Error('Solidark kernel is not loaded')
    }

    if (typeof kernel[method] !== 'function') {
      throw new TypeError(`Kernel does not implement ${method}() for ${this.tag}`)
    }

    return kernel[method](properties, children)
  }

  initializeInternals () {
    this.rendered = Promise.resolve(this)
    this.updated = Promise.resolve(this)
    this.ready = Promise.resolve(this)
    this._renderScheduled = false
    return this
  }

  connectedCallback () {
    this.scheduleRender()
    return this
  }

  attributeChangedCallback () {
    this.scheduleRender()
    return this
  }

  get properties () {
    return this.readProperties()
  }

  get content () {
    return this.innerHTML
  }

  get kernel () {
    return this.constructor.kernel
  }

  set content (value) {
    this.innerHTML = value
    this.scheduleUpdate()
  }

  init (properties = {}) {
    Object.assign(this, properties)
    this.scheduleRender()
    return this
  }

  render () {
    return this
  }

  load () {
    return SolidarkRuntime.load()
  }

  evaluate () {
    return SolidarkRuntime.evaluate(this)
  }

  scheduleRender () {
    if (!this._renderScheduled) {
      this._renderScheduled = true
      this.rendered = SolidarkRuntime.schedule(() => {
        this._renderScheduled = false
        this.render()
        return this
      })
    }

    return this.rendered
  }

  scheduleUpdate () {
    this.updated = SolidarkRuntime.schedule(() => this)
    return this.updated
  }

  readProperties () {
    const properties = { ...this.constructor.defaultProperties }

    for (const [name, value] of attributeEntries(this)) {
      properties[camelCase(name)] = parseAttributeValue(value)
    }

    for (const key of Object.keys(this)) {
      if (!key.startsWith('_') && !RESERVED_KEYS.has(key)) {
        properties[key] = this[key]
      }
    }

    return properties
  }
}

function attributeEntries (element) {
  if (element.attributes instanceof Map) {
    return element.attributes.entries()
  }

  return Array.from(element.attributes || [], (attribute) => [attribute.name, attribute.value])
}
