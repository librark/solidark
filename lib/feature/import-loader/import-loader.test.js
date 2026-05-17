import assert from 'node:assert/strict'
import { it } from 'node:test'

import { parseMarkup } from '../../dom.js'
import { StlComponent } from '../stl/stl.js'
import { importObservedAttributes, inlineImportProperties, loadRemoteImport } from './import-loader.js'

it('defines shared import source attributes', () => {
  assert.deepEqual(inlineImportProperties, ['data', 'source', 'content', 'text'])
  assert.deepEqual(importObservedAttributes, ['src', 'href', 'data', 'source', 'content', 'text'])
})

it('loads remote import bytes from src attributes before evaluation', async () => {
  const [stl] = parseMarkup('<sol-stl src="https://example.test/part.stl"></sol-stl>')
  const requests = []

  stl.fetch = async (url) => {
    requests.push(url)
    return {
      ok: true,
      async arrayBuffer () {
        return new Uint8Array([1, 2, 3]).buffer
      }
    }
  }

  await stl.rendered
  await stl.ready
  await stl.scheduleRender()
  await stl.ready

  assert.deepEqual(requests, ['https://example.test/part.stl'])
  assert.deepEqual([...stl.properties.data], [1, 2, 3])
})

it('reloads remote import data when the source URL changes', async () => {
  const [stl] = parseMarkup('<sol-stl src="https://example.test/first.stl"></sol-stl>')
  const requests = []

  stl.fetch = async (url) => {
    requests.push(url)
    return {
      ok: true,
      async arrayBuffer () {
        return new Uint8Array([requests.length]).buffer
      }
    }
  }

  await stl.rendered
  await stl.ready
  stl.setAttribute('src', 'https://example.test/second.stl')
  await stl.rendered
  await stl.ready

  assert.deepEqual(requests, ['https://example.test/first.stl', 'https://example.test/second.stl'])
  assert.deepEqual([...stl.properties.data], [2])
})

it('loads remote import data from href attributes and text-only responses', async () => {
  const [stl] = parseMarkup('<sol-stl href="https://example.test/text.stl"></sol-stl>')

  stl.fetch = async (url) => {
    assert.equal(url, 'https://example.test/text.stl')
    return {
      async text () {
        return 'solid text-stl'
      }
    }
  }

  await stl.rendered
  await stl.ready

  assert.equal(stl.properties.data, 'solid text-stl')
})

it('uses the global fetch function when no component fetch override is provided', async () => {
  const originalFetch = globalThis.fetch
  const requests = []

  try {
    globalThis.fetch = async (url) => {
      requests.push(url)
      return {
        ok: true,
        async arrayBuffer () {
          return new Uint8Array([4, 5, 6]).buffer
        }
      }
    }

    const [stl] = parseMarkup('<sol-stl src="https://example.test/global.stl"></sol-stl>')

    await stl.rendered
    await stl.ready

    assert.deepEqual(requests, ['https://example.test/global.stl'])
    assert.deepEqual([...stl.properties.data], [4, 5, 6])
  } finally {
    globalThis.fetch = originalFetch
  }
})

it('keeps inline import content authoritative over fetchable URLs', async () => {
  const [stl] = parseMarkup('<sol-stl src="https://example.test/part.stl" data="solid inline"></sol-stl>')

  stl.fetch = async () => {
    throw new Error('should not fetch inline data')
  }

  await stl.rendered
  await stl.ready

  assert.equal(stl.properties.data, 'solid inline')
})

it('leaves virtual file paths to the kernel instead of fetching them', async () => {
  const [stl] = parseMarkup('<sol-stl path="/solidark-import.stl"></sol-stl>')

  stl.fetch = async () => {
    throw new Error('should not fetch virtual paths')
  }

  await stl.rendered
  await stl.ready

  assert.equal(stl.properties.path, '/solidark-import.stl')
  assert.equal(stl.properties.data, undefined)
})

it('reports remote import loading failures', async () => {
  const [stl] = parseMarkup('<sol-stl src="https://example.test/missing.stl"></sol-stl>')

  stl.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found'
  })

  await stl.rendered
  await assert.rejects(() => stl.ready, /Unable to fetch STL https:\/\/example.test\/missing.stl: 404 Not Found/)
})

it('reports remote import loading failures without optional status details', async () => {
  const [stl] = parseMarkup('<sol-stl src="https://example.test/rejected.stl"></sol-stl>')

  stl.fetch = async () => ({
    ok: false
  })

  await stl.rendered
  await assert.rejects(() => stl.ready, /Unable to fetch STL https:\/\/example.test\/rejected.stl/)
})

it('reports missing fetch support for remote import URLs', async () => {
  const [stl] = parseMarkup('<sol-stl src="https://example.test/part.stl"></sol-stl>')
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = undefined
    await stl.rendered
    await assert.rejects(() => stl.ready, /fetch is not available/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

it('uses component format names in diagnostics', async () => {
  class TestStepComponent extends StlComponent {
    static tag = 'test-step-import'

    render () {
      this.ready = loadRemoteImport(this, 'STEP')
      return this
    }
  }

  TestStepComponent.define()
  const [step] = parseMarkup('<test-step-import src="https://example.test/missing.step"></test-step-import>')

  step.fetch = async () => ({ ok: false })

  await step.rendered
  await assert.rejects(() => step.ready, /Unable to fetch STEP https:\/\/example.test\/missing.step/)
})
