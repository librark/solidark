import { Component } from '../../base/index.js'

export class CuboidComponent extends Component {
  static tag = 'sol-cuboid'
  static category = 'primitive'
  static geometryKind = 'solid'
}

CuboidComponent.define()
