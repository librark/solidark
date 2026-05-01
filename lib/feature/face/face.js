import { Component } from '../../base/index.js'

export class FaceComponent extends Component {
  static tag = 'sol-face'
  static category = 'feature'
  static geometryKind = 'surface'
  static kernelMethod = 'face'
}

FaceComponent.define()
