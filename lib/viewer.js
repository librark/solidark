/**
 * Minimal browser visualization adapter for evaluated Solidark results.
 */
export class Viewer {
  constructor (target = null) {
    this.target = target
    this.result = null
  }

  render (result) {
    this.result = result

    if (this.target) {
      const svg = createSceneSvg(result.shapes)

      if ('innerHTML' in this.target) {
        this.target.innerHTML = svg
      } else {
        this.target.textContent = svg
      }
    }

    return this
  }

  clear () {
    this.result = null

    if (this.target) {
      this.target.textContent = ''

      if ('innerHTML' in this.target) {
        this.target.innerHTML = ''
      }
    }

    return this
  }
}

/**
 * Creates a viewer adapter.
 *
 * @param {{ textContent?: string } | null} target
 * @returns {Viewer}
 */
export function createViewer (target = null) {
  return new Viewer(target)
}

/**
 * Renders the current descriptor graph as an inspectable isometric SVG preview.
 *
 * @param {DescriptorShape[]} shapes
 * @returns {string}
 */
export function createSceneSvg (shapes = []) {
  const entries = collectPrimitiveEntries(shapes)
  const body = entries.length === 0
    ? '<text x="360" y="210" text-anchor="middle" class="empty">No geometry</text>'
    : entries.map(drawEntry).join('')

  return `<svg viewBox="0 0 720 420" role="img" aria-label="Solidark model preview" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="420" fill="#ffffff"></rect>
  <path d="M80 320H640M120 280H600M160 240H560M200 200H520" stroke="#e1e7ee" stroke-width="1"></path>
  ${body}
</svg>`
}

/**
 * Collects primitive shapes from descriptor output.
 *
 * @param {DescriptorShape[]} shapes
 * @returns {DescriptorShape[]}
 */
export function collectPrimitiveEntries (shapes) {
  const entries = []

  for (const shape of shapes) {
    appendPrimitiveEntry(entries, shape)
  }

  return entries
}

function appendPrimitiveEntry (entries, shape) {
  if (shape.category === 'primitive') {
    entries.push(shape)
  }

  for (const child of shape.children || []) {
    appendPrimitiveEntry(entries, child)
  }
}

function drawEntry (shape, index) {
  const column = index % 4
  const row = Math.floor(index / 4)
  const x = 140 + column * 145 + row * 28
  const y = 270 - row * 62
  const hue = 178 + ((index * 41) % 130)
  const label = shape.tag.replace('sol-', '')

  return `<g transform="translate(${x} ${y})">
    <polygon points="0,-38 42,-62 84,-38 42,-14" fill="hsl(${hue} 54% 74%)" stroke="#233241" stroke-width="2"></polygon>
    <polygon points="0,-38 42,-14 42,46 0,20" fill="hsl(${hue} 48% 58%)" stroke="#233241" stroke-width="2"></polygon>
    <polygon points="84,-38 42,-14 42,46 84,20" fill="hsl(${hue} 44% 48%)" stroke="#233241" stroke-width="2"></polygon>
    <text x="42" y="72" text-anchor="middle">${label}</text>
  </g>`
}

/**
 * @typedef {object} DescriptorShape
 * @property {string} category
 * @property {string} tag
 * @property {Record<string, unknown>} properties
 * @property {DescriptorShape[]} children
 */
