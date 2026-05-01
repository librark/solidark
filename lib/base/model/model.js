import { Component } from '../component.js'

export class ModelComponent extends Component {
  static tag = 'sol-model'
  static category = 'model'
  static geometryKind = 'model'
}

ModelComponent.define()
