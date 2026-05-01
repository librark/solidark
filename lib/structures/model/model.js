import { Component } from '../../base/index.js'

export class ModelComponent extends Component {
  static tag = 'sol-model'
  static category = 'structure'
  static geometryKind = 'model'
  static kernelMethod = 'union'

  static evaluateNode (node, children, kernel = this.kernel) {
    if (children.length === 0) {
      return []
    }

    if (node.implicitUnion) {
      return [this.createKernelShape({ implicit: true }, children, kernel)]
    }

    return children
  }
}

ModelComponent.define()
