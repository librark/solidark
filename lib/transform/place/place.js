import { Component } from '../../base/index.js'

export class PlaceComponent extends Component {
  static tag = 'sol-place'
  static category = 'transform'
  static geometryKind = 'shape'
  static shapeGeometryKind = 'child'
  static childGeometryKinds = ['geometry']
  static build (properties, children, kernel) {
    return kernel.place(properties, children)
  }
}

PlaceComponent.define()
