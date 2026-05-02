import { Component } from '../../base/index.js'

export class SweepComponent extends Component {
  static tag = 'sol-sweep'
  static category = 'feature'
  static geometryKind = 'solid'
  static childGeometryKinds = ['sketch', 'surface']
  static build (properties, children, kernel) {
    return kernel.sweep(properties, children)
  }
}

SweepComponent.define()
