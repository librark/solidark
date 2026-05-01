import { Kernel } from './contract.js'

export class MemoryKernel extends Kernel {
  constructor () {
    super({ name: 'in-memory' })
  }

  cuboid (properties = {}, children = []) {
    return this.createShape('cuboid', properties, children)
  }

  sphere (properties = {}, children = []) {
    return this.createShape('sphere', properties, children)
  }

  cylinder (properties = {}, children = []) {
    return this.createShape('cylinder', properties, children)
  }

  cone (properties = {}, children = []) {
    return this.createShape('cone', properties, children)
  }

  torus (properties = {}, children = []) {
    return this.createShape('torus', properties, children)
  }

  circle (properties = {}, children = []) {
    return this.createShape('circle', properties, children)
  }

  ellipse (properties = {}, children = []) {
    return this.createShape('ellipse', properties, children)
  }

  rectangle (properties = {}, children = []) {
    return this.createShape('rectangle', properties, children)
  }

  polygon (properties = {}, children = []) {
    return this.createShape('polygon', properties, children)
  }

  polyline (properties = {}, children = []) {
    return this.createShape('polyline', properties, children)
  }

  translate (properties = {}, children = []) {
    return this.createShape('translate', properties, children)
  }

  rotate (properties = {}, children = []) {
    return this.createShape('rotate', properties, children)
  }

  scale (properties = {}, children = []) {
    return this.createShape('scale', properties, children)
  }

  mirror (properties = {}, children = []) {
    return this.createShape('mirror', properties, children)
  }

  matrix (properties = {}, children = []) {
    return this.createShape('matrix', properties, children)
  }

  place (properties = {}, children = []) {
    return this.createShape('place', properties, children)
  }

  workplane (properties = {}, children = []) {
    return this.createShape('workplane', properties, children)
  }

  union (properties = {}, children = []) {
    return this.createShape('union', properties, children)
  }

  difference (properties = {}, children = []) {
    return this.createShape('difference', properties, children)
  }

  intersection (properties = {}, children = []) {
    return this.createShape('intersection', properties, children)
  }

  group (properties = {}, children = []) {
    return this.createShape('group', properties, children)
  }

  fillet (properties = {}, children = []) {
    return this.createShape('fillet', properties, children)
  }

  chamfer (properties = {}, children = []) {
    return this.createShape('chamfer', properties, children)
  }

  shell (properties = {}, children = []) {
    return this.createShape('shell', properties, children)
  }

  offset (properties = {}, children = []) {
    return this.createShape('offset', properties, children)
  }

  extrude (properties = {}, children = []) {
    return this.createShape('extrude', properties, children)
  }

  revolve (properties = {}, children = []) {
    return this.createShape('revolve', properties, children)
  }

  sweep (properties = {}, children = []) {
    return this.createShape('sweep', properties, children)
  }

  loft (properties = {}, children = []) {
    return this.createShape('loft', properties, children)
  }

  section (properties = {}, children = []) {
    return this.createShape('section', properties, children)
  }

  face (properties = {}, children = []) {
    return this.createShape('face', properties, children)
  }

  sketch (properties = {}, children = []) {
    return this.createShape('sketch', properties, children)
  }

  move (properties = {}, children = []) {
    return this.createShape('move', properties, children)
  }

  line (properties = {}, children = []) {
    return this.createShape('line', properties, children)
  }

  arc (properties = {}, children = []) {
    return this.createShape('arc', properties, children)
  }

  close (properties = {}, children = []) {
    return this.createShape('close', properties, children)
  }

  step (properties = {}, children = []) {
    return this.createShape('step', properties, children)
  }

  stl (properties = {}, children = []) {
    return this.createShape('stl', properties, children)
  }

  brep (properties = {}, children = []) {
    return this.createShape('brep', properties, children)
  }
}

/**
 * Creates an in-memory descriptor kernel for tests and lightweight previews.
 *
 * @returns {MemoryKernel}
 */
export function createInMemoryKernel () {
  return new MemoryKernel()
}

export const createDescriptorKernel = createInMemoryKernel

/**
 * @typedef {import("./contract.js").KernelShape} DescriptorShape
 */
