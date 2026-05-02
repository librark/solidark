import { Component } from '../../base/index.js'

export class ShellComponent extends Component {
  static tag = 'sol-shell'
  static category = 'feature'
  static geometryKind = 'solid'
  static childGeometryKinds = ['solid', 'shape']
  static build (properties, children, kernel) {
    return kernel.shell(properties, children)
  }
}

ShellComponent.define()
