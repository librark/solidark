import { Component } from '../../base/index.js'

export class ConeComponent extends Component {
  static tag = 'sol-cone'
  static category = 'primitive'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.cone(properties, children)
  }
}

ConeComponent.define()
