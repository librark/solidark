import assert from 'node:assert/strict'
import { it } from 'node:test'

import { countModelTags, getShowcaseModel, listShowcaseSummaries, showcaseModels } from './models.js'

it('exports a range of showcase models', () => {
  assert.equal(showcaseModels.length >= 5, true)
  assert.deepEqual(
    listShowcaseSummaries()[0],
    {
      id: 'primitives',
      title: 'Primitive Set',
      level: 'Basic',
      summary: 'Centered cuboid, cylinder, sphere, cone, and torus primitives in a grouped model.'
    }
  )
})

it('gets models by id and falls back to the first model', () => {
  assert.equal(getShowcaseModel('bracket').title, 'Parametric Bracket')
  assert.equal(getShowcaseModel('missing').id, 'primitives')
})

it('counts Solidark element tags in markup', () => {
  const counts = countModelTags(getShowcaseModel('bracket').markup)

  assert.equal(counts['sol-model'], 1)
  assert.equal(counts['sol-cuboid'], 3)
  assert.equal(counts['sol-cylinder'], 2)
})
