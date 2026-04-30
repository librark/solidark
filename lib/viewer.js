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
      this.target.textContent = JSON.stringify({
        shapes: result.shapes.length,
        tags: result.shapes.map((shape) => shape.tag)
      })
    }

    return this
  }

  clear () {
    this.result = null

    if (this.target) {
      this.target.textContent = ''
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
