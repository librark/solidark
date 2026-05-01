import { Component } from '../../base/index.js'

export class SectionComponent extends Component {
  static tag = 'sol-section'
  static category = 'feature'
  static geometryKind = 'sketch'
  static build (properties, children, kernel) {
    return kernel.section(properties, children)
  }
}

SectionComponent.define()
