import { Component } from '../../base/index.js'

export class LineComponent extends Component {
  static tag = 'sol-line'
  static category = 'sketch'
  static geometryKind = null
  static build (properties, children, kernel) {
    return kernel.line(properties, children)
  }
}

LineComponent.define()
