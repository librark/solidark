import { Component } from '../../base/index.js'

export class DifferenceComponent extends Component {
  static tag = 'sol-difference'
  static category = 'operation'
  static geometryKind = 'shape'
  static kernelMethod = 'difference'
}

DifferenceComponent.define()
