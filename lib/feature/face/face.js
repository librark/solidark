import { Component } from '../../base/index.js'

export class FaceComponent extends Component {
  static tag = 'sol-face'
  static category = 'feature'
  static geometryKind = 'surface'
  static childGeometryKinds = ['sketch']
  static build (properties, children, kernel) {
    return kernel.face(properties, children)
  }
}

FaceComponent.define()
