import { Component } from '../../base/index.js'
import { importObservedAttributes, loadRemoteImport } from '../import-loader/import-loader.js'

export class StepComponent extends Component {
  static tag = 'sol-step'
  static category = 'external'
  static geometryKind = 'assembly'
  static defaultProperties = { preserveHierarchy: true }
  static observedAttributes = importObservedAttributes

  render () {
    this.ready = loadRemoteImport(this, 'STEP')
    return this
  }

  static build (properties, children, kernel) {
    return kernel.step(properties, children)
  }
}

StepComponent.define()
