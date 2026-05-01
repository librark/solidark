import { Component } from '../../base/index.js'

export class RotateComponent extends Component {
  static tag = 'sol-rotate'
  static category = 'transform'
  static geometryKind = 'shape'
  static kernelMethod = 'rotate'
}

RotateComponent.define()
