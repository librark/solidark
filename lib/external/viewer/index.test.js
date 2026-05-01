import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  ThreeCadRenderer,
  ViewerComponent,
  canUseThreeTarget,
  createThreeCadScene,
  createViewer
} from './index.js'

it('exports the viewer component and renderer helpers', () => {
  assert.equal(ViewerComponent.tag, 'sol-viewer')
  assert.equal(typeof createViewer, 'function')
  assert.equal(typeof ThreeCadRenderer, 'function')
  assert.equal(typeof canUseThreeTarget, 'function')
  assert.equal(typeof createThreeCadScene, 'function')
})
