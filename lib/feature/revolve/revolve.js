import { Component } from '../../base/index.js'

export class RevolveComponent extends Component {
  static tag = 'sol-revolve'
  static category = 'feature'
  static geometryKind = 'solid'
  static kernelMethod = 'revolve'
}

RevolveComponent.define()
