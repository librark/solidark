import assert from 'node:assert/strict'
import { it } from 'node:test'

import { bootStandaloneShowcase } from './standalone.js'

it('boots standalone showcase pages with Solidark elements and kernel configuration', async () => {
  const calls = []
  const mode = await bootStandaloneShowcase({
    defineElements () {
      calls.push('define')
    },
    configureKernel () {
      calls.push('kernel')
      return 'memory'
    }
  })

  assert.equal(mode, 'memory')
  assert.deepEqual(calls, ['kernel', 'define'])
})

it('loads Solidark elements on demand after configuring the standalone kernel', async () => {
  const mode = await bootStandaloneShowcase({
    configureKernel () {
      return 'memory'
    }
  })

  assert.equal(mode, 'memory')
})
