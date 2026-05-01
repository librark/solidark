import { Component } from '../../base/index.js'

export class FilletComponent extends Component {
  static tag = 'sol-fillet'
  static category = 'feature'
  static geometryKind = 'solid'
  static build (properties, children, kernel) {
    return kernel.fillet(properties, children)
  }
}

FilletComponent.define()
