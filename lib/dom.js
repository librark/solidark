const registry = new Map()

/**
 * A minimal HTMLElement-compatible class for Node tests and DOM-free runtimes.
 */
export class MemoryHTMLElement {
  constructor () {
    this.attributes = new Map()
    this.childNodes = []
    this.parentNode = null
    this.localName = this.constructor.tag || 'memory-element'
    this._innerHTML = ''
  }

  setAttribute (name, value = '') {
    const stringValue = String(value)
    const oldValue = this.getAttribute(name)
    this.attributes.set(name, stringValue)
    this.attributeChangedCallback?.(name, oldValue, stringValue)
    return this
  }

  getAttribute (name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null
  }

  hasAttribute (name) {
    return this.attributes.has(name)
  }

  removeAttribute (name) {
    const oldValue = this.getAttribute(name)
    this.attributes.delete(name)
    this.attributeChangedCallback?.(name, oldValue, null)
    return this
  }

  appendChild (child) {
    child.parentNode = this
    this.childNodes.push(child)
    return child
  }

  append (...children) {
    children.forEach((child) => this.appendChild(child))
    return this
  }

  replaceChildren (...children) {
    this.childNodes.forEach((child) => {
      child.parentNode = null
    })
    this.childNodes = []
    return this.append(...children)
  }

  get children () {
    return this.childNodes
  }

  get innerHTML () {
    return this._innerHTML
  }

  set innerHTML (value) {
    this._innerHTML = String(value)
    this.replaceChildren(...parseMarkup(this._innerHTML))
  }
}

export const HTMLElementBase = resolveHTMLElementBase()

function resolveHTMLElementBase () {
  /* node:coverage ignore next 3 */
  if (globalThis.HTMLElement) {
    return globalThis.HTMLElement
  }

  return MemoryHTMLElement
}

/**
 * Registers a custom element class in the local and native registries.
 *
 * @param {string} tag
 * @param {CustomElementConstructor} constructor
 * @returns {CustomElementConstructor}
 */
export function defineElement (tag, constructor) {
  const existing = registry.get(tag)

  if (existing && existing !== constructor) {
    throw new Error(`Custom element already defined for ${tag}`)
  }

  registry.set(tag, constructor)

  /* node:coverage ignore if */
  if (globalThis.customElements && !globalThis.customElements.get(tag)) {
    globalThis.customElements.define(tag, constructor)
  }

  return constructor
}

/**
 * Reads a class registered through Solidark's registry.
 *
 * @param {string} tag
 * @returns {CustomElementConstructor | undefined}
 */
export function getDefinedElement (tag) {
  return registry.get(tag)
}

/**
 * Creates a registered element in DOM-free runtimes.
 *
 * @param {string} tag
 * @returns {Element}
 */
export function createElement (tag) {
  const Constructor = registry.get(tag) || MemoryHTMLElement
  const element = new Constructor()
  element.localName = tag
  return element
}

/**
 * Parses trusted Solidark markup into element instances.
 *
 * @param {string} markup
 * @returns {Element[]}
 */
export function parseMarkup (markup) {
  const root = { children: [] }
  const stack = [root]
  const tagPattern = /<\s*(\/?)\s*([a-zA-Z][\w-]*)([^>]*)>/g
  let match

  while ((match = tagPattern.exec(String(markup)))) {
    const [, closing, tag, rawAttributes] = match

    if (closing) {
      closeElement(stack, tag)
      continue
    }

    const element = createElement(tag)
    readAttributes(rawAttributes, element)
    stack.at(-1).children.push(element)

    if (!rawAttributes.trim().endsWith('/')) {
      stack.push(element)
    }
  }

  if (stack.length !== 1) {
    throw new Error(`Unclosed element ${stack.at(-1).localName}`)
  }

  return root.children
}

function closeElement (stack, tag) {
  const current = stack.pop()

  if (current.localName !== tag) {
    throw new Error(`Unexpected closing tag ${tag}`)
  }
}

function readAttributes (rawAttributes, element) {
  const attributePattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g
  let attribute

  while ((attribute = attributePattern.exec(rawAttributes))) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = attribute
    element.setAttribute(name, doubleQuoted ?? singleQuoted ?? unquoted ?? '')
  }
}
