import { Component } from '../../base/index.js'

export class WorkplaneComponent extends Component {
  static tag = 'sol-workplane'
  static category = 'transform'
  static geometryKind = 'shape'
  static build (properties, children, kernel) {
    return kernel.workplane(properties, children)
  }
}

WorkplaneComponent.define()
