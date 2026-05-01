import { Component } from '../../base/index.js'

export class FilletComponent extends Component {
  static tag = 'sol-fillet'
  static category = 'feature'
  static geometryKind = 'solid'
}

FilletComponent.define()
