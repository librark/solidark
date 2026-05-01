import { Component } from '../../base/index.js'

export class ColorComponent extends Component {
  static tag = 'sol-color'
  static category = 'styling'
  static geometryKind = null

  static evaluateNode (node, children) {
    const styling = stylingFromProperties(colorProperties(node.properties || {}))

    if (!styling) {
      return children
    }

    return children.map((child) => applyStyling(child, styling))
  }

  static build (properties, children, kernel) {
    return kernel.color(colorProperties(properties), children)
  }
}

ColorComponent.define()

function colorProperties (properties) {
  return {
    ...properties,
    color: properties.color ?? properties.colour ?? properties.value
  }
}

function stylingFromProperties (properties) {
  return properties.color === undefined
    ? null
    : { color: properties.color }
}

function applyStyling (shape, styling) {
  if (!shape || typeof shape !== 'object') {
    return shape
  }

  return {
    ...shape,
    styling: {
      ...styling,
      ...(shape.styling || {})
    }
  }
}
