import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as primitives from './index.js'

it('exports primitive components', () => {
  assert.equal(primitives.CuboidComponent.tag, 'sol-cuboid')
  assert.equal(primitives.SphereComponent.tag, 'sol-sphere')
  assert.equal(primitives.CylinderComponent.tag, 'sol-cylinder')
  assert.equal(primitives.ConeComponent.tag, 'sol-cone')
  assert.equal(primitives.TorusComponent.tag, 'sol-torus')
  assert.equal(primitives.CircleComponent.tag, 'sol-circle')
  assert.equal(primitives.EllipseComponent.tag, 'sol-ellipse')
  assert.equal(primitives.RectangleComponent.tag, 'sol-rectangle')
  assert.equal(primitives.PolygonComponent.tag, 'sol-polygon')
  assert.equal(primitives.PolylineComponent.tag, 'sol-polyline')
})
