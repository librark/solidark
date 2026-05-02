export class Kernel {
  constructor ({ name = 'kernel' } = {}) {
    if (new.target === Kernel) {
      throw new TypeError('Kernel is abstract and cannot be instantiated directly')
    }

    this.name = name
  }

  createShape (method, properties = {}, children = []) {
    return {
      method,
      properties,
      children,
      disposed: false
    }
  }

  toMesh () {
    return null
  }

  toStep () {
    return null
  }

  toStl () {
    return null
  }

  toBrep () {
    return null
  }

  dispose (entry) {
    entry.disposed = true
  }

  cuboid () {
    return this.abstractMethod('cuboid')
  }

  sphere () {
    return this.abstractMethod('sphere')
  }

  cylinder () {
    return this.abstractMethod('cylinder')
  }

  cone () {
    return this.abstractMethod('cone')
  }

  torus () {
    return this.abstractMethod('torus')
  }

  circle () {
    return this.abstractMethod('circle')
  }

  ellipse () {
    return this.abstractMethod('ellipse')
  }

  rectangle () {
    return this.abstractMethod('rectangle')
  }

  polygon () {
    return this.abstractMethod('polygon')
  }

  polyline () {
    return this.abstractMethod('polyline')
  }

  translate () {
    return this.abstractMethod('translate')
  }

  rotate () {
    return this.abstractMethod('rotate')
  }

  scale () {
    return this.abstractMethod('scale')
  }

  mirror () {
    return this.abstractMethod('mirror')
  }

  matrix () {
    return this.abstractMethod('matrix')
  }

  place () {
    return this.abstractMethod('place')
  }

  workplane () {
    return this.abstractMethod('workplane')
  }

  union () {
    return this.abstractMethod('union')
  }

  difference () {
    return this.abstractMethod('difference')
  }

  intersection () {
    return this.abstractMethod('intersection')
  }

  group () {
    return this.abstractMethod('group')
  }

  color () {
    return this.abstractMethod('color')
  }

  fillet () {
    return this.abstractMethod('fillet')
  }

  chamfer () {
    return this.abstractMethod('chamfer')
  }

  shell () {
    return this.abstractMethod('shell')
  }

  offset () {
    return this.abstractMethod('offset')
  }

  extrude () {
    return this.abstractMethod('extrude')
  }

  revolve () {
    return this.abstractMethod('revolve')
  }

  sweep () {
    return this.abstractMethod('sweep')
  }

  loft () {
    return this.abstractMethod('loft')
  }

  section () {
    return this.abstractMethod('section')
  }

  face () {
    return this.abstractMethod('face')
  }

  sketch () {
    return this.abstractMethod('sketch')
  }

  move () {
    return this.abstractMethod('move')
  }

  line () {
    return this.abstractMethod('line')
  }

  arc () {
    return this.abstractMethod('arc')
  }

  close () {
    return this.abstractMethod('close')
  }

  step () {
    return this.abstractMethod('step')
  }

  stl () {
    return this.abstractMethod('stl')
  }

  brep () {
    return this.abstractMethod('brep')
  }

  abstractMethod (method) {
    throw new TypeError(`${this.constructor.name} must implement ${method}()`)
  }
}

/**
 * @typedef {object} KernelShape
 * @property {string} method
 * @property {string} [category]
 * @property {string} [tag]
 * @property {Record<string, unknown>} properties
 * @property {KernelShape[]} children
 * @property {{ color?: unknown }} [styling]
 * @property {unknown} [value]
 * @property {unknown[]} [handles]
 * @property {boolean} disposed
 */
