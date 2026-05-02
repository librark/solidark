import { Component } from '../../base/index.js'

export class RevolveComponent extends Component {
  static tag = 'sol-revolve'
  static category = 'feature'
  static geometryKind = 'solid'
  static childGeometryKinds = ['sketch', 'surface']
  static build (properties, children, kernel) {
    return kernel.revolve(properties, children)
  }
}

RevolveComponent.define()
