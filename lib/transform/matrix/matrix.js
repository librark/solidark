import { Component } from '../../base/index.js'

export class MatrixComponent extends Component {
  static tag = 'sol-matrix'
  static category = 'transform'
  static geometryKind = 'shape'
  static build (properties, children, kernel) {
    return kernel.matrix(properties, children)
  }
}

MatrixComponent.define()
