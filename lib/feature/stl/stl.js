import { Component } from '../../base/index.js'

export class StlComponent extends Component {
  static tag = 'sol-stl'
  static category = 'external'
  static geometryKind = 'mesh'
  static kernelMethod = 'stl'
}

StlComponent.define()
