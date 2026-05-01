import { Component } from '../../base/index.js'

export class CircleComponent extends Component {
  static tag = 'sol-circle'
  static category = 'primitive'
  static geometryKind = 'sketch'
  static build (properties, children, kernel) {
    return kernel.circle(properties, children)
  }
}

CircleComponent.define()
