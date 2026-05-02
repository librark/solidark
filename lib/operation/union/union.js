import { Component } from '../../base/index.js'

export class UnionComponent extends Component {
  static tag = 'sol-union'
  static category = 'operation'
  static geometryKind = 'shape'
  static childGeometryKinds = ['solid', 'surface', 'shape', 'assembly']
  static build (properties, children, kernel) {
    return kernel.union(properties, children)
  }
}

UnionComponent.define()
