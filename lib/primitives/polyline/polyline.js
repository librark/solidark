import { Component } from '../../base/index.js'

export class PolylineComponent extends Component {
  static tag = 'sol-polyline'
  static category = 'primitive'
  static geometryKind = 'sketch'
  static build (properties, children, kernel) {
    return kernel.polyline(properties, children)
  }
}

PolylineComponent.define()
