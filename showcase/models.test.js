import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { it } from 'node:test'

import {
  countModelTags,
  extractShowcaseMarkup,
  getShowcaseModel,
  listShowcaseSummaries,
  loadShowcaseModel,
  readShowcaseSource,
  showcaseModels
} from './models.js'

it('exports a range of showcase model documents', () => {
  assert.equal(showcaseModels.length >= 5, true)
  assert.deepEqual(
    listShowcaseSummaries()[0],
    {
      id: 'primitives',
      title: 'Primitive Set',
      level: 'Basic',
      format: 'HTML',
      source: './examples/primitives.html',
      summary: 'Centered cuboid, cylinder, sphere, cone, and torus primitives in a grouped model.'
    }
  )
})

it('gets models by id and falls back to the first model', () => {
  assert.equal(getShowcaseModel('bracket').title, 'Parametric Bracket')
  assert.equal(getShowcaseModel('topology-features').source, './examples/topology-features.html')
  assert.equal(getShowcaseModel('missing').id, 'primitives')
})

it('loads and extracts model markup from standalone showcase documents', async () => {
  const model = await loadShowcaseModel('bracket', {
    async readText () {
      return `
        <html>
          <body>
            <sol-model id="bracket" data-showcase-model>
              <sol-cuboid></sol-cuboid>
              <sol-cuboid></sol-cuboid>
              <sol-cuboid></sol-cuboid>
              <sol-cylinder></sol-cylinder>
              <sol-cylinder></sol-cylinder>
            </sol-model>
          </body>
        </html>
      `
    }
  })
  const counts = countModelTags(model.markup)

  assert.equal(model.title, 'Parametric Bracket')
  assert.equal(model.markup.includes('data-showcase-model'), false)
  assert.equal(counts['sol-model'], 1)
  assert.equal(counts['sol-cuboid'], 3)
  assert.equal(counts['sol-cylinder'], 2)
})

it('keeps bracket cutter cylinders oriented through the front faces', async () => {
  const sourceText = await readFile(new URL('./examples/bracket.html', import.meta.url), 'utf8')
  const markup = extractShowcaseMarkup(sourceText)
  const counts = countModelTags(markup)

  assert.equal(counts['sol-cylinder'], 2)
  assert.equal(counts['sol-rotate'], 2)
  assert.equal(markup.includes('<sol-rotate by="90 0 0">'), true)
})

it('extracts component showcase roots and reports missing model markers', () => {
  assert.equal(
    extractShowcaseMarkup('<showcase-enclosure id="part" data-showcase-model></showcase-enclosure>'),
    '<showcase-enclosure id="part"></showcase-enclosure>'
  )
  assert.throws(
    () => extractShowcaseMarkup('<sol-model></sol-model>'),
    /data-showcase-model/
  )
  assert.equal(countModelTags('<showcase-enclosure><sol-cuboid></sol-cuboid></showcase-enclosure>')['showcase-enclosure'], 1)
})

it('loads the topology feature showcase markup', async () => {
  const model = await loadShowcaseModel('topology-features', {
    async readText () {
      return `
        <html>
          <body>
            <sol-model id="topology-features" data-showcase-model>
              <sol-fillet radius="2.5" edges="rounded">
                <sol-cuboid topology="rounded:edge:first,last"></sol-cuboid>
              </sol-fillet>
              <sol-chamfer distance="2" edges="base">
                <sol-cuboid topology="base:edge:0..3"></sol-cuboid>
              </sol-chamfer>
              <sol-shell thickness="2" faces="lid">
                <sol-cuboid topology="lid:face:last"></sol-cuboid>
              </sol-shell>
            </sol-model>
          </body>
        </html>
      `
    }
  })
  const counts = countModelTags(model.markup)

  assert.equal(model.title, 'Topology Features')
  assert.equal(model.markup.includes('edges="rounded"'), true)
  assert.equal(model.markup.includes('topology="rounded:edge:first,last"'), true)
  assert.equal(model.markup.includes('topology="base:edge:0..3"'), true)
  assert.equal(model.markup.includes('faces="lid"'), true)
  assert.equal(counts['sol-fillet'], 1)
  assert.equal(counts['sol-chamfer'], 1)
  assert.equal(counts['sol-shell'], 1)
})

it('reads showcase sources through fetch', async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async (source) => ({
      ok: source !== './missing.html',
      async text () {
        return '<sol-model data-showcase-model></sol-model>'
      }
    })

    assert.equal(await readShowcaseSource('./ok.html'), '<sol-model data-showcase-model></sol-model>')
    await assert.rejects(() => readShowcaseSource('./missing.html'), /Unable to load/)
    assert.equal((await loadShowcaseModel('primitives')).markup, '<sol-model></sol-model>')
  } finally {
    globalThis.fetch = originalFetch
  }
})
