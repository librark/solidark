import { Component } from '../../base/index.js'

export class BrepComponent extends Component {
  static tag = 'sol-brep'
  static category = 'external'
  static geometryKind = 'shape'
  static build (properties, children, kernel) {
    return kernel.brep(properties, children)
  }
}

BrepComponent.define()
