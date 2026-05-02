import { Component } from '../../base/index.js'

export class OffsetComponent extends Component {
  static tag = 'sol-offset'
  static category = 'feature'
  static geometryKind = 'shape'
  static childGeometryKinds = ['solid', 'surface', 'shape']
  static build (properties, children, kernel) {
    return kernel.offset(properties, children)
  }
}

OffsetComponent.define()
