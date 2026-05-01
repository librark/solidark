import { HTMLElementBase, defineElement } from '../dom.js'
import { SolidarkRuntime } from '../runtime/index.js'
import { getGlobalKernel } from './kernel/index.js'
import { camelCase, parseAttributeValue, stableStringify } from './utils.js'

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
  static shapeTag = null
  static shapeCategory = null

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
    if (this.build === Component.build) {
      return children
    }

    return [this.createKernelShape(node.properties || {}, children, kernel)]
  }

  static createKernelShape (properties = {}, children = [], kernel = this.kernel) {
    if (!kernel) {
      throw new Error('Solidark kernel is not loaded')
    }

    return this.decorateKernelShape(this.build(properties, children, kernel))
  }

  static build () {
    return null
  }

  static decorateKernelShape (shape) {
    if (shape && typeof shape === 'object') {
      shape.category = shape.category || this.shapeCategory || this.category
      shape.tag = shape.tag || this.shapeTag || this.tag
      shape.method = shape.method || shape.tag.replace(/^sol-/, '')
      shape.styling = mergeStyling(
        stylingFromChildren(shape.children, shape.category),
        mergeStyling(shape.styling, stylingFromProperties(shape.properties))
      )

      if (!shape.styling) {
        delete shape.styling
      }
    }

    return shape
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

function mergeStyling (current, next) {
  if (!current && !next) {
    return undefined
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

function stylingFromChildren (children = [], category = null) {
  if (children.length === 0) {
    return null
  }

  const stylings = children.map((child) => child?.styling).filter(Boolean)

  if (category === 'feature') {
    return stylings[0] || null
  }

  if (stylings.length !== children.length) {
    return null
  }

  const [first] = stylings
  const key = stableStringify(first)

  return stylings.every((styling) => stableStringify(styling) === key) ? first : null
}
