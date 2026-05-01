import { Component } from '../../base/index.js'

export class ArcComponent extends Component {
  static tag = 'sol-arc'
  static category = 'sketch'
  static geometryKind = null
  static build (properties, children, kernel) {
    return kernel.arc(properties, children)
  }
}

ArcComponent.define()
