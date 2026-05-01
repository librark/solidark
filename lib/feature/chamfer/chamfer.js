import { Component } from '../../base/index.js'

export class ChamferComponent extends Component {
  static tag = 'sol-chamfer'
  static category = 'feature'
  static geometryKind = 'solid'
  static kernelMethod = 'chamfer'
}

ChamferComponent.define()
