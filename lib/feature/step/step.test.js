import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../../dom.js'
import { StepComponent } from './step.js'

it('defines sol-step as a hierarchy-preserving file importer', () => {
  assert.equal(StepComponent.tag, 'sol-step')
  assert.equal(StepComponent.category, 'external')
  assert.equal(StepComponent.geometryKind, 'assembly')
  assert.deepEqual(StepComponent.defaultProperties, { preserveHierarchy: true })
  assert.deepEqual(StepComponent.observedAttributes, ['src', 'href', 'data', 'source', 'content', 'text'])
})

it('loads remote STEP files before evaluation', async () => {
  const [step] = parseMarkup('<sol-step src="https://example.test/assembly.step"></sol-step>')

  step.fetch = async (url) => {
    assert.equal(url, 'https://example.test/assembly.step')
    return {
      ok: true,
      async text () {
        return 'ISO-10303-21;'
      }
    }
  }

  await step.rendered
  await step.ready

  assert.equal(step.properties.data, 'ISO-10303-21;')
})
