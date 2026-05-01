import { Component } from '../../base/index.js'

export class SketchComponent extends Component {
  static tag = 'sol-sketch'
  static category = 'sketch'
  static geometryKind = 'sketch'
  static kernelMethod = 'sketch'
}

SketchComponent.define()
