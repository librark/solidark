import { Component } from '../../base/index.js'

export class SweepComponent extends Component {
  static tag = 'sol-sweep'
  static category = 'feature'
  static geometryKind = 'solid'
  static kernelMethod = 'sweep'
}

SweepComponent.define()
