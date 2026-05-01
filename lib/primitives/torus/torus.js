import { Component } from '../../base/index.js'

export class TorusComponent extends Component {
  static tag = 'sol-torus'
  static category = 'primitive'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.torus(properties, children)
  }
}

TorusComponent.define()
