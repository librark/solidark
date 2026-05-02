import { Component } from '../../base/index.js'

export class MirrorComponent extends Component {
  static tag = 'sol-mirror'
  static category = 'transform'
  static geometryKind = 'shape'
  static shapeGeometryKind = 'child'
  static childGeometryKinds = ['geometry']
  static build (properties, children, kernel) {
    return kernel.mirror(properties, children)
  }
}

MirrorComponent.define()
