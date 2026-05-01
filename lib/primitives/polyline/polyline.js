import { Component } from '../../base/index.js'

export class PolylineComponent extends Component {
  static tag = 'sol-polyline'
  static category = 'primitive'
  static geometryKind = 'sketch'
  static kernelMethod = 'polyline'
}

PolylineComponent.define()
