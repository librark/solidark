import { Component } from '../../base/index.js'

export class ChamferComponent extends Component {
  static tag = 'sol-chamfer'
  static category = 'feature'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.chamfer(properties, children)
  }
}

ChamferComponent.define()
