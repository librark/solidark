import { Component } from '../../base/index.js'

export class IntersectionComponent extends Component {
  static tag = 'sol-intersection'
  static category = 'operation'
  static geometryKind = 'shape'
  static build (properties, children, kernel) {
    return kernel.intersection(properties, children)
  }
}

IntersectionComponent.define()
