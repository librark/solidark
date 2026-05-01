import { Component } from '../../base/index.js'

export class MoveComponent extends Component {
  static tag = 'sol-move'
  static category = 'sketch'
  static geometryKind = null
  static build (properties, children, kernel) {
    return kernel.move(properties, children)
  }
}

MoveComponent.define()
