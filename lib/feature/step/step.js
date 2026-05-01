import { Component } from '../../base/index.js'

export class StepComponent extends Component {
  static tag = 'sol-step'
  static category = 'external'
  static geometryKind = 'assembly'
  static defaultProperties = { preserveHierarchy: true }

  static build (properties, children, kernel) {
    return kernel.step(properties, children)
  }
}

StepComponent.define()
