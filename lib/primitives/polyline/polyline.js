import { Component } from '../../base/index.js'

export class PolylineComponent extends Component {
  static tag = 'sol-polyline'
  static category = 'primitive'
  static geometryKind = 'sketch'
}

PolylineComponent.define()
