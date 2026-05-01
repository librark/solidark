import { Component } from '../../base/index.js'

export class SketchComponent extends Component {
  static tag = 'sol-sketch'
  static category = 'sketch'
  static geometryKind = 'sketch'
  static build (properties, children, kernel) {
    return kernel.sketch(properties, children)
  }
}

SketchComponent.define()
