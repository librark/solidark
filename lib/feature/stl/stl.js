import { Component } from '../../base/index.js'
import { importObservedAttributes, loadRemoteImport } from '../import-loader/import-loader.js'

export class StlComponent extends Component {
  static tag = 'sol-stl'
  static category = 'external'
  static geometryKind = 'mesh'
  static observedAttributes = importObservedAttributes

  render () {
    this.ready = loadRemoteImport(this, 'STL')
    return this
  }

  static build (properties, children, kernel) {
    return kernel.stl(properties, children)
  }
}

StlComponent.define()
