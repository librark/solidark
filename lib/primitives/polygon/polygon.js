import { Component } from '../../base/index.js'

export class PolygonComponent extends Component {
  static tag = 'sol-polygon'
  static category = 'primitive'
  static geometryKind = 'sketch'
  static build (properties, children, kernel) {
    return kernel.polygon(properties, children)
  }
}

PolygonComponent.define()
