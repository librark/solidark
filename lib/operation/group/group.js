import { Component } from '../../base/index.js'

export class GroupComponent extends Component {
  static tag = 'sol-group'
  static category = 'operation'
  static geometryKind = 'shape'
  static kernelMethod = 'group'
}

GroupComponent.define()
