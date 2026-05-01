import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as styling from './index.js'

it('exports styling components', () => {
  assert.equal(styling.ColorComponent.tag, 'sol-color')
})
