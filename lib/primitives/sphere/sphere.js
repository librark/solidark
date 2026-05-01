import { Component } from '../../base/index.js'

export class SphereComponent extends Component {
  static tag = 'sol-sphere'
  static category = 'primitive'
  static geometryKind = 'solid'
}

SphereComponent.define()
