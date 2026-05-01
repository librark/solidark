import { Component } from '../../base/index.js'

export class FaceComponent extends Component {
  static tag = 'sol-face'
  static category = 'feature'
  static geometryKind = 'surface'
  static build (properties, children, kernel) {
    return kernel.face(properties, children)
  }
}

FaceComponent.define()
