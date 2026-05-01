import { Component } from '../../base/index.js'

export class CloseComponent extends Component {
  static tag = 'sol-close'
  static category = 'sketch'
  static geometryKind = null
  static build (properties, children, kernel) {
    return kernel.close(properties, children)
  }
}

CloseComponent.define()
