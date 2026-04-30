import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  MemoryHTMLElement,
  createElement,
  defineElement,
  getDefinedElement,
  parseMarkup
} from './dom.js'

class DemoElement extends MemoryHTMLElement {
  static tag = 'demo-element'
}

it('defineElement registers and returns a constructor', () => {
  assert.equal(defineElement('demo-element', DemoElement), DemoElement)
  assert.equal(getDefinedElement('demo-element'), DemoElement)
})

it('defineElement is idempotent for the same constructor', () => {
  assert.equal(defineElement('demo-element', DemoElement), DemoElement)
})

it('defineElement rejects incompatible duplicate tags', () => {
  class OtherElement extends MemoryHTMLElement {}

  assert.throws(() => defineElement('demo-element', OtherElement), /already defined/)
})

it('defineElement mirrors registration to native customElements when present', () => {
  const originalCustomElements = globalThis.customElements
  const calls = []

  globalThis.customElements = {
    get () {
      return undefined
    },
    define (tag, constructor) {
      calls.push([tag, constructor])
    }
  }

  class NativeMirrorElement extends MemoryHTMLElement {}

  try {
    defineElement('native-mirror', NativeMirrorElement)
  } finally {
    globalThis.customElements = originalCustomElements
  }

  assert.deepEqual(calls, [['native-mirror', NativeMirrorElement]])
})

it('defineElement skips native registration when the tag already exists', () => {
  const originalCustomElements = globalThis.customElements
  const calls = []

  class NativeExistingElement extends MemoryHTMLElement {}

  globalThis.customElements = {
    get () {
      return NativeExistingElement
    },
    define (tag, constructor) {
      calls.push([tag, constructor])
    }
  }

  try {
    defineElement('native-existing', NativeExistingElement)
  } finally {
    globalThis.customElements = originalCustomElements
  }

  assert.deepEqual(calls, [])
})

it('MemoryHTMLElement manages attributes and children', () => {
  const parent = new MemoryHTMLElement()
  const child = new MemoryHTMLElement()

  parent.setAttribute('enabled')
  parent.setAttribute('size', 2)
  parent.appendChild(child)

  assert.equal(parent.hasAttribute('enabled'), true)
  assert.equal(parent.getAttribute('size'), '2')
  assert.equal(parent.children[0], child)
  assert.equal(child.parentNode, parent)

  parent.removeAttribute('size')
  assert.equal(parent.getAttribute('size'), null)
})

it('MemoryHTMLElement notifies attribute changes when callback exists', () => {
  const changes = []

  class CallbackElement extends MemoryHTMLElement {
    attributeChangedCallback (name, oldValue, newValue) {
      changes.push([name, oldValue, newValue])
    }
  }

  const element = new CallbackElement()

  element.setAttribute('mode', 'add')
  element.removeAttribute('mode')

  assert.deepEqual(changes, [
    ['mode', null, 'add'],
    ['mode', 'add', null]
  ])
})

it('MemoryHTMLElement replaceChildren detaches old children', () => {
  const parent = new MemoryHTMLElement()
  const oldChild = new MemoryHTMLElement()
  const newChild = new MemoryHTMLElement()

  parent.append(oldChild)
  parent.replaceChildren(newChild)
  parent.append()

  assert.equal(oldChild.parentNode, null)
  assert.deepEqual(parent.children, [newChild])
})

it('MemoryHTMLElement parses empty innerHTML into no children', () => {
  const element = new MemoryHTMLElement()

  element.innerHTML = 'plain text'

  assert.deepEqual(element.children, [])
})

it('createElement uses registered constructors', () => {
  const element = createElement('demo-element')

  assert.equal(element instanceof DemoElement, true)
  assert.equal(element.localName, 'demo-element')
})

it('parseMarkup parses nested elements and attribute forms', () => {
  const [root] = parseMarkup(`
    <demo-element enabled name="plate" one='1' two=2>
      <unknown-child />
    </demo-element>
  `)

  assert.equal(root.localName, 'demo-element')
  assert.equal(root.getAttribute('enabled'), '')
  assert.equal(root.getAttribute('name'), 'plate')
  assert.equal(root.getAttribute('one'), '1')
  assert.equal(root.getAttribute('two'), '2')
  assert.equal(root.children[0].localName, 'unknown-child')
})

it('parseMarkup rejects invalid nesting', () => {
  assert.throws(() => parseMarkup('<demo-element></wrong-element>'), /Unexpected closing tag/)
  assert.throws(() => parseMarkup('<demo-element>'), /Unclosed element/)
})
