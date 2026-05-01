import { Component } from '../../base/index.js'

export class DifferenceComponent extends Component {
  static tag = 'sol-difference'
  static category = 'operation'
  static geometryKind = 'shape'
  static build (properties, children, kernel) {
    return kernel.difference(properties, children)
  }
}

DifferenceComponent.define()
