import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ViewerComponent } from './index.js'

it('exports the external viewer component', () => {
  assert.equal(ViewerComponent.tag, 'sol-viewer')
  assert.equal(ViewerComponent.category, 'external')
})
