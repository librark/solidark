import { Component } from '../../base/index.js'

export class GroupComponent extends Component {
  static tag = 'sol-group'
  static category = 'operation'
  static geometryKind = 'shape'
  static build (properties, children, kernel) {
    return kernel.group(properties, children)
  }
}

GroupComponent.define()
