import { Component } from '../../base/index.js'

export class StlComponent extends Component {
  static tag = 'sol-stl'
  static category = 'external'
  static geometryKind = 'mesh'
  static build (properties, children, kernel) {
    return kernel.stl(properties, children)
  }
}

StlComponent.define()
