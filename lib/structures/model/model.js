import { Component } from '../../base/index.js'

export class ModelComponent extends Component {
  static tag = 'sol-model'
  static category = 'structure'
  static geometryKind = 'model'
  static shapeGeometryKind = 'shape'
  static childGeometryKinds = ['geometry']
  static shapeTag = 'sol-union'
  static shapeCategory = 'operation'

  static evaluateNode (node, children, kernel = this.kernel) {
    if (children.length === 0) {
      return []
    }

    this.validateChildGeometry(
      children,
      node.implicitUnion ? ['solid', 'surface', 'shape', 'assembly', 'mesh'] : this.childGeometryKinds
    )

    if (node.implicitUnion) {
      return [this.createKernelShape({ ...node.properties, implicit: true }, children, kernel)]
    }

    return children
  }

  static build (properties, children, kernel) {
    return kernel.union(properties, children)
  }
}

ModelComponent.define()
