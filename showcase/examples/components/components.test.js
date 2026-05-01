import assert from 'node:assert/strict'
import { it } from 'node:test'

import { ShowcaseEnclosureComponent } from './enclosure.js'
import { ShowcaseLoftedHandleComponent } from './lofted-handle.js'

it('renders component-authored showcase models', () => {
  const enclosure = new ShowcaseEnclosureComponent()
  const handle = new ShowcaseLoftedHandleComponent()

  assert.equal(enclosure.render(), enclosure)
  assert.equal(enclosure.content.includes('<sol-chamfer'), true)
  assert.equal(enclosure.content.includes('<sol-stl'), true)

  assert.equal(handle.render(), handle)
  assert.equal(handle.content.includes('<sol-loft'), true)
  assert.equal(handle.content.includes('<sol-sketch'), true)
})
