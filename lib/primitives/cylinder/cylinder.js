import { Component } from '../../base/index.js'

export class CylinderComponent extends Component {
  static tag = 'sol-cylinder'
  static category = 'primitive'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.cylinder(properties, children)
  }
}

CylinderComponent.define()
