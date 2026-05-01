import { Component } from '../../base/index.js'

export class PolygonComponent extends Component {
  static tag = 'sol-polygon'
  static category = 'primitive'
  static geometryKind = 'sketch'
  static kernelMethod = 'polygon'
}

PolygonComponent.define()
