import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as feature from './index.js'

it('exports feature, sketch action, and importer components', () => {
  assert.equal(feature.FilletComponent.tag, 'sol-fillet')
  assert.equal(feature.ChamferComponent.tag, 'sol-chamfer')
  assert.equal(feature.ShellComponent.tag, 'sol-shell')
  assert.equal(feature.OffsetComponent.tag, 'sol-offset')
  assert.equal(feature.ExtrudeComponent.tag, 'sol-extrude')
  assert.equal(feature.RevolveComponent.tag, 'sol-revolve')
  assert.equal(feature.SweepComponent.tag, 'sol-sweep')
  assert.equal(feature.LoftComponent.tag, 'sol-loft')
  assert.equal(feature.SectionComponent.tag, 'sol-section')
  assert.equal(feature.FaceComponent.tag, 'sol-face')
  assert.equal(feature.SketchComponent.tag, 'sol-sketch')
  assert.equal(feature.MoveComponent.tag, 'sol-move')
  assert.equal(feature.LineComponent.tag, 'sol-line')
  assert.equal(feature.CloseComponent.tag, 'sol-close')
  assert.equal(feature.StepComponent.tag, 'sol-step')
  assert.equal(feature.StlComponent.tag, 'sol-stl')
  assert.equal(feature.BrepComponent.tag, 'sol-brep')
})
