import { Component } from '../../base/index.js'

export class LineComponent extends Component {
  static tag = 'sol-line'
  static category = 'sketch'
  static geometryKind = null
  static kernelMethod = 'line'
}

LineComponent.define()
