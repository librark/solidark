import { Component } from '../../base/index.js'

export class CuboidComponent extends Component {
  static tag = 'sol-cuboid'
  static category = 'primitive'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.cuboid(properties, children)
  }
}

CuboidComponent.define()
