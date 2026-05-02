import { Component } from '../../base/index.js'

export class ExtrudeComponent extends Component {
  static tag = 'sol-extrude'
  static category = 'feature'
  static geometryKind = 'solid'
  static childGeometryKinds = ['sketch', 'surface']
  static build (properties, children, kernel) {
    return kernel.extrude(properties, children)
  }
}

ExtrudeComponent.define()
