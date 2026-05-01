import { Component } from '../../base/index.js'

export class LoftComponent extends Component {
  static tag = 'sol-loft'
  static category = 'feature'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.loft(properties, children)
  }
}

LoftComponent.define()
