import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as structures from './index.js'

it('exports structural components', () => {
  assert.equal(structures.ModelComponent.tag, 'sol-model')
})
