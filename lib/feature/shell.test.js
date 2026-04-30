import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ShellComponent } from './shell.js'

it('defines sol-shell as a solid feature', () => {
  assert.equal(ShellComponent.tag, 'sol-shell')
  assert.equal(ShellComponent.category, 'feature')
  assert.equal(ShellComponent.geometryKind, 'solid')
})
