import { Component } from '../../base/index.js'

export class IntersectionComponent extends Component {
  static tag = 'sol-intersection'
  static category = 'operation'
  static geometryKind = 'shape'
  static kernelMethod = 'intersection'
}

IntersectionComponent.define()
