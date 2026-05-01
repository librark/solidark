import { Component } from '../../base/index.js'

export class EllipseComponent extends Component {
  static tag = 'sol-ellipse'
  static category = 'primitive'
  static geometryKind = 'sketch'
  static build (properties, children, kernel) {
    return kernel.ellipse(properties, children)
  }
}

EllipseComponent.define()
