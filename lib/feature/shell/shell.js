import { Component } from '../../base/index.js'

export class ShellComponent extends Component {
  static tag = 'sol-shell'
  static category = 'feature'
  static geometryKind = 'solid'
  static kernelMethod = 'shell'
}

ShellComponent.define()
