import { Component } from '../../base/index.js'

export class RotateComponent extends Component {
  static tag = 'sol-rotate'
  static category = 'transform'
  static geometryKind = 'shape'
  static childGeometryKinds = ['geometry']
  static build (properties, children, kernel) {
    return kernel.rotate(properties, children)
  }
}

RotateComponent.define()
