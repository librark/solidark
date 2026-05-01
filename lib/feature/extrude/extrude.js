import { Component } from '../../base/index.js'

export class ExtrudeComponent extends Component {
  static tag = 'sol-extrude'
  static category = 'feature'
  static geometryKind = 'solid'
  static kernelMethod = 'extrude'
}

ExtrudeComponent.define()
