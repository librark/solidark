import { Component } from '../../base/index.js'
import { SolidarkRuntime } from '../../runtime/index.js'
import { createViewer } from './renderer.js'

export class ViewerComponent extends Component {
  static tag = 'sol-viewer'
  static category = 'external'
  static geometryKind = null
  static observedAttributes = ['for', 'grid', 'grid-size']

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
      const viewer = this.viewer

      this._result = result
      viewer.options = this.viewerOptions
      viewer.render(result)
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
    this._viewer ||= createViewer(this, this.viewerOptions)
    return this._viewer
  }

  get viewerOptions () {
    const { grid, gridSize } = this.properties

    return {
      gridSize: viewerGridSize(gridSize),
      gridVisible: viewerGridVisible(grid)
    }
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

function viewerGridVisible (value) {
  return ![false, 'false', 'off', 'no', '0'].includes(value)
}

function viewerGridSize (value) {
  const size = Number(value ?? 10)

  return Number.isFinite(size) && size > 0 ? size : 10
}
