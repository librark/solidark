import { Component } from './component.js'

export function createElementClass (tag, category, geometryKind, defaultProperties = {}) {
  return class SolidarkElement extends Component {
    static tag = tag
    static category = category
    static geometryKind = geometryKind
    static defaultProperties = defaultProperties
  }
}
