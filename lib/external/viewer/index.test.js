import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ViewerComponent, createViewer } from './index.js'

it('exports the viewer component and renderer helpers', () => {
  assert.equal(ViewerComponent.tag, 'sol-viewer')
  assert.equal(typeof createViewer, 'function')
})
