import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../../dom.js'
import { BrepComponent } from './brep.js'

it('defines sol-brep as a kernel-native file importer', () => {
  assert.equal(BrepComponent.tag, 'sol-brep')
  assert.equal(BrepComponent.category, 'external')
  assert.equal(BrepComponent.geometryKind, 'shape')
  assert.deepEqual(BrepComponent.observedAttributes, ['src', 'href', 'data', 'source', 'content', 'text'])
})

it('loads remote BREP files before evaluation', async () => {
  const [brep] = parseMarkup('<sol-brep href="https://example.test/part.brep"></sol-brep>')

  brep.fetch = async (url) => {
    assert.equal(url, 'https://example.test/part.brep')
    return {
      ok: true,
      async text () {
        return 'DBRep_DrawableShape'
      }
    }
  }

  await brep.rendered
  await brep.ready

  assert.equal(brep.properties.data, 'DBRep_DrawableShape')
})
