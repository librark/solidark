import { Component } from '../../base/index.js'

export class SphereComponent extends Component {
  static tag = 'sol-sphere'
  static category = 'primitive'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.sphere(properties, children)
  }
}

SphereComponent.define()
