import assert from 'node:assert/strict'
import { it } from 'node:test'

import { bootStandaloneShowcase } from './standalone.js'

it('boots standalone showcase pages with Solidark elements and kernel configuration', () => {
  const calls = []
  const mode = bootStandaloneShowcase({
    defineElements () {
      calls.push('define')
    },
    configureKernel () {
      calls.push('kernel')
      return 'memory'
    }
  })

  assert.equal(mode, 'memory')
  assert.deepEqual(calls, ['define', 'kernel'])
})
