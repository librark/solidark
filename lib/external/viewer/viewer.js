import { Component } from '../../base/index.js'
import { SolidarkRuntime } from '../../runtime/index.js'
import { createViewer } from './renderer.js'

export class ViewerComponent extends Component {
  static tag = 'sol-viewer'
  static category = 'external'
  static geometryKind = null
  static observedAttributes = ['for']

  initializeInternals () {
    super.initializeInternals()
    this._result = null
    this._viewer = null
    return this
  }

  connectedCallback () {
    this.ready = this.scheduleRender().then(() => this.ready)
    return this
  }

  attributeChangedCallback () {
    this.ready = this.scheduleRender().then(() => this.ready)
    return this
  }

  render () {
    const target = this.resolveTarget()

    if (target) {
      this.ready = this.refresh(target).catch(() => this)
    } else {
      this.ready = Promise.resolve(this)
    }

    return this
  }

  async refresh (target = this.resolveTarget(), { runtime = this.runtime || SolidarkRuntime } = {}) {
    if (!target) {
      const error = new Error('sol-viewer requires a referenced Solidark model')
      this.showError(error)
      throw error
    }

    this.clear()

    try {
      const result = await runtime.evaluate(target)

      this._result = result
      this.viewer.render(result)
      return result
    } catch (error) {
      this.showError(error)
      throw error
    }
  }

  clear () {
    disposeResult(this._result)
    this._result = null
    this.viewer.clear()
    return this
  }

  showError (error) {
    this.clear()
    this.textContent = `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`
    return this
  }

  resolveTarget () {
    if (isElementLike(this.model)) {
      return this.model
    }

    const reference = this.properties.for
    const root = this.getRootNode?.() || this.ownerDocument || globalThis.document

    if (!reference || !root?.getElementById) {
      return null
    }

    return root.getElementById(String(reference).replace(/^#/, ''))
  }

  get viewer () {
    this._viewer ||= createViewer(this)
    return this._viewer
  }
}

ViewerComponent.define()

function isElementLike (value) {
  return value && typeof value === 'object' && typeof value.localName === 'string'
}

function disposeResult (result) {
  if (result && typeof result.dispose === 'function') {
    result.dispose()
  }
}
