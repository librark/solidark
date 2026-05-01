import { Component } from '../../base/index.js'

export class RectangleComponent extends Component {
  static tag = 'sol-rectangle'
  static category = 'primitive'
  static geometryKind = 'sketch'
}

RectangleComponent.define()
