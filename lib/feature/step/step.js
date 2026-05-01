import { Component } from '../../base/index.js'

export class StepComponent extends Component {
  static tag = 'sol-step'
  static category = 'external'
  static geometryKind = 'assembly'
  static defaultProperties = { preserveHierarchy: true }
}

StepComponent.define()
