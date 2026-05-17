import { Component } from '../../base/index.js'
import { importObservedAttributes, loadRemoteImport } from '../import-loader/import-loader.js'

export class BrepComponent extends Component {
  static tag = 'sol-brep'
  static category = 'external'
  static geometryKind = 'shape'
  static observedAttributes = importObservedAttributes

  render () {
    this.ready = loadRemoteImport(this, 'BREP')
    return this
  }

  static build (properties, children, kernel) {
    return kernel.brep(properties, children)
  }
}

BrepComponent.define()
