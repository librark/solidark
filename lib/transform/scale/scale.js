import { Component } from '../../base/index.js'

export class ScaleComponent extends Component {
  static tag = 'sol-scale'
  static category = 'transform'
  static geometryKind = 'shape'
  static childGeometryKinds = ['geometry']
  static build (properties, children, kernel) {
    return kernel.scale(properties, children)
  }
}

ScaleComponent.define()
