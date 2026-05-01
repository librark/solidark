import { Component } from '../../base/index.js'

export class TorusComponent extends Component {
  static tag = 'sol-torus'
  static category = 'primitive'
  static geometryKind = 'solid'
  static kernelMethod = 'torus'
}

TorusComponent.define()
