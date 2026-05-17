import assert from 'node:assert/strict'
import { it } from 'node:test'

import {
  BREP_MIME_TYPE,
  STEP_MIME_TYPE,
  STL_MIME_TYPE,
  createCadExportBlob,
  createCadExportObjectUrl,
  downloadCadExport,
  downloadResultToBrep,
  downloadResultToStep,
  downloadResultToStl,
  exportMeshesToStl,
  exportResultToBrep,
  exportResultToStep,
  exportResultToStl,
  exportShapeToBrep,
  exportShapeToStep,
  exportShapeToStl
} from './cad.js'

it('exports CAD MIME type constants', () => {
  assert.equal(BREP_MIME_TYPE, 'model/vnd.opencascade.brep')
  assert.equal(STEP_MIME_TYPE, 'model/step')
  assert.equal(STL_MIME_TYPE, 'model/stl')
})

it('delegates STEP and STL export to the provided kernel', () => {
  const entry = { value: 'shape' }
  const calls = []
  const kernel = {
    toStep (shape, options) {
      calls.push(['step', shape, options])
      return 'STEP'
    },
    toStl (shape, options) {
      calls.push(['stl', shape, options])
      return 'STL'
    },
    toBrep (shape, options) {
      calls.push(['brep', shape, options])
      return 'BREP'
    }
  }

  assert.equal(exportShapeToStep(entry, { kernel }), 'STEP')
  assert.equal(exportShapeToStl(entry, { kernel }), 'STL')
  assert.equal(exportShapeToBrep(entry, { kernel }), 'BREP')
  assert.deepEqual(calls.map(([type, shape]) => [type, shape]), [
    ['step', entry],
    ['stl', entry],
    ['brep', entry]
  ])
})

it('delegates CAD export to the global kernel when no kernel is passed', () => {
  const previous = globalThis.kernel

  try {
    globalThis.kernel = {
      toStep () {
        return 'GLOBAL STEP'
      }
    }

    assert.equal(exportShapeToStep({}), 'GLOBAL STEP')
  } finally {
    globalThis.kernel = previous
  }
})

it('exports evaluated results through the selected kernel', () => {
  const first = { tag: 'first' }
  const second = { tag: 'second' }
  const grouped = { tag: 'grouped' }
  const calls = []
  const kernel = {
    group (properties, children) {
      calls.push(['group', properties, children])
      return grouped
    },
    toBrep (shape, options) {
      calls.push(['brep', shape, options])
      return 'BREP'
    },
    toStep (shape, options) {
      calls.push(['step', shape, options])
      return 'STEP'
    },
    toStl (shape, options) {
      calls.push(['stl', shape, options])
      return 'STL'
    }
  }

  assert.equal(exportResultToStep({ shapes: [first] }, { kernel }), 'STEP')
  assert.equal(exportResultToStl({ shapes: [first, second] }, { kernel }), 'STL')
  assert.equal(exportResultToBrep({ shapes: [first, second] }, { kernel, shape: 'first' }), 'BREP')
  assert.equal(exportResultToStep(first, { kernel }), 'STEP')
  assert.equal(exportResultToStl({ shapes: [] }, { kernel }), 'STL')
  assert.deepEqual(calls.map(([type, shape]) => [type, shape]), [
    ['step', first],
    ['group', { export: true, implicit: true }],
    ['stl', grouped],
    ['brep', first],
    ['step', first],
    ['stl', null]
  ])
})

it('exports evaluated renderable meshes as STL data', () => {
  const mesh = {
    tag: 'sol-cuboid',
    vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
    triangles: [[0, 1, 2]]
  }
  const kernel = {
    toStl () {
      throw new Error('STL result export should use renderable meshes first')
    }
  }
  const stl = exportResultToStl({ meshes: [mesh], shapes: [{ tag: 'sol-cuboid' }] }, { kernel, name: 'solidark model' })

  assert.match(stl, /^solid solidark-model/)
  assert.match(stl, /facet normal 0 0 1/)
  assert.match(stl, /vertex 1 0 0/)
  assert.match(stl, /endsolid solidark-model\n$/)
  assert.equal(exportShapeToStl({ mesh }, { kernel }), exportMeshesToStl([mesh]))
  assert.equal(exportShapeToStl(mesh, { kernel }), exportMeshesToStl([mesh]))
  assert.match(exportMeshesToStl([mesh], { name: '   ' }), /^solid solidark/)
  assert.equal(
    exportResultToStl({ meshes: [mesh, { vertices: [], triangles: [] }] }, { kernel: { toStl: () => 'fallback' }, shape: 'first' }),
    exportMeshesToStl([mesh])
  )
  assert.equal(
    exportResultToStl({ meshes: [{ vertices: [] }], shapes: [{ value: 'shape' }] }, { kernel: { toStl: () => 'fallback' } }),
    'fallback'
  )
  assert.equal(
    exportMeshesToStl([{ vertices: [] }], { name: 'empty mesh' }),
    'solid empty-mesh\nendsolid empty-mesh\n'
  )
  assert.match(
    exportMeshesToStl([{
      vertices: [[0, 0, 0], [1, 0, 0], [2, 0, 0]],
      triangles: [[0, 1, 2]]
    }]),
    /facet normal 0 0 0/
  )
})

it('rejects empty and mesh-only CAD exports for incompatible formats', () => {
  const meshOnly = {
    tag: 'sol-stl',
    value: null,
    mesh: {
      vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      triangles: [[0, 1, 2]]
    }
  }
  const kernel = {
    group () {
      return { tag: 'sol-group', value: 'group' }
    },
    toBrep () {
      return ''
    },
    toStep () {
      return ''
    },
    toStl () {
      return ''
    }
  }

  assert.throws(() => exportResultToStep({ shapes: [meshOnly] }, { kernel }), /mesh-only STL/)
  assert.throws(() => exportResultToBrep({ shapes: [{ children: [meshOnly] }] }, { kernel }), /mesh-only STL/)
  assert.throws(() => exportShapeToStep(meshOnly, { kernel }), /mesh-only STL/)
  assert.throws(() => exportShapeToBrep({ value: 'shape' }, { kernel }), /produced no data/)
  assert.throws(() => exportShapeToStl({ value: 'shape' }, { kernel }), /produced no data/)
  assert.equal(exportShapeToStep(null, { kernel: { toStep: () => 'STEP' } }), 'STEP')
  assert.deepEqual(
    exportShapeToStep({ value: 'shape' }, { kernel: { toStep: () => new Uint8Array([1, 2, 3]) } }),
    new Uint8Array([1, 2, 3])
  )
  assert.equal(
    exportShapeToBrep({ value: 'shape' }, { kernel: { toBrep: () => new ArrayBuffer(2) } }).byteLength,
    2
  )
  assert.deepEqual(
    exportShapeToBrep({ value: 'shape' }, { kernel: { toBrep: () => ({ data: 'BREP' }) } }),
    { data: 'BREP' }
  )
  assert.throws(() => exportShapeToStep({ value: 'shape' }, { kernel: { toStep: () => null } }), /produced no data/)
})

it('rejects ambiguous multi-shape result export without grouping support', () => {
  assert.throws(
    () => exportResultToStep({ shapes: [{}, {}] }, { kernel: { toStep () {} } }),
    /multiple shapes/
  )
})

it('creates export blobs, object URLs, and browser downloads', () => {
  const created = []
  const revoked = []
  const scheduled = []
  const clicks = []
  const appended = []
  class BlobStub {
    constructor (parts, options) {
      this.parts = parts
      this.options = options
    }
  }
  const url = {
    createObjectURL (blob) {
      created.push(blob)
      return 'blob:cad'
    },
    revokeObjectURL (value) {
      revoked.push(value)
    }
  }
  const document = {
    body: {
      appendChild (element) {
        appended.push(element)
      }
    },
    createElement (tag) {
      return {
        tag,
        style: {},
        click () {
          clicks.push(this.href)
        },
        remove () {
          this.removed = true
        }
      }
    }
  }

  const blob = createCadExportBlob('STEP', STEP_MIME_TYPE, BlobStub)
  assert.deepEqual(blob.parts, ['STEP'])
  assert.equal(blob.options.type, STEP_MIME_TYPE)

  const object = createCadExportObjectUrl('STL', { Blob: BlobStub, mimeType: STL_MIME_TYPE, url })
  assert.equal(object.url, 'blob:cad')
  assert.equal(created.length, 1)

  const defaultObject = createCadExportObjectUrl('raw', { Blob: BlobStub, url })
  assert.equal(defaultObject.blob.options.type, 'application/octet-stream')
  const globalObject = createCadExportObjectUrl('global')
  assert.equal(globalObject.blob.type, 'application/octet-stream')
  URL.revokeObjectURL(globalObject.url)

  const download = downloadCadExport('BREP', {
    Blob: BlobStub,
    document,
    filename: 'model.brep',
    mimeType: BREP_MIME_TYPE,
    scheduleRevoke (callback, delay) {
      scheduled.push([callback, delay])
    },
    url
  })

  assert.equal(download.filename, 'model.brep')
  assert.equal(download.anchor.download, 'model.brep')
  assert.equal(download.anchor.rel, 'noreferrer')
  assert.equal(download.anchor.style.display, 'none')
  assert.deepEqual(clicks, ['blob:cad'])
  assert.equal(appended[0], download.anchor)
  assert.equal(download.anchor.removed, true)
  assert.deepEqual(revoked, [])
  assert.equal(scheduled[0][1], 0)
  scheduled[0][0]()
  assert.deepEqual(revoked, ['blob:cad'])

  const bareDocument = {
    createElement () {
      return {
        click () {}
      }
    }
  }
  const bareUrl = {
    createObjectURL () {
      return 'blob:bare'
    },
    revokeObjectURL (value) {
      revoked.push(value)
    }
  }
  const bareDownload = downloadCadExport('data', {
    Blob: BlobStub,
    document: bareDocument,
    revoke: false,
    url: bareUrl
  })
  assert.equal(bareDownload.filename, 'solidark-export')
  assert.equal(bareDownload.anchor.download, 'solidark-export')
  assert.deepEqual(revoked, ['blob:cad'])

  const originalSetTimeout = globalThis.setTimeout

  try {
    globalThis.setTimeout = undefined
    downloadCadExport('data', { Blob: BlobStub, document: bareDocument, url: bareUrl })
    assert.deepEqual(revoked, ['blob:cad', 'blob:bare'])
  } finally {
    globalThis.setTimeout = originalSetTimeout
  }
})

it('downloads evaluated results with default CAD filenames', () => {
  const downloads = []
  class BlobStub {
    constructor (parts, options) {
      this.parts = parts
      this.options = options
    }
  }
  const document = {
    createElement () {
      return {
        click () {},
        remove () {}
      }
    }
  }
  const url = {
    createObjectURL (blob) {
      downloads.push(blob)
      return `blob:${downloads.length}`
    },
    revokeObjectURL () {}
  }
  const kernel = {
    toBrep () {
      return 'BREP'
    },
    toStep () {
      return 'STEP'
    },
    toStl () {
      return 'STL'
    }
  }

  assert.equal(downloadResultToBrep({ shapes: [{}] }, { Blob: BlobStub, document, kernel, url }).filename, 'solidark-model.brep')
  assert.equal(downloadResultToStep({ shapes: [{}] }, { Blob: BlobStub, document, kernel, url }).filename, 'solidark-model.step')
  assert.equal(downloadResultToStl({ shapes: [{}] }, { Blob: BlobStub, document, kernel, url }).filename, 'solidark-model.stl')
  assert.deepEqual(downloads.map((blob) => blob.options.type), [BREP_MIME_TYPE, STEP_MIME_TYPE, STL_MIME_TYPE])
})

it('rejects missing CAD export kernel support', () => {
  assert.throws(
    () => exportShapeToStep({}, { kernel: {} }),
    /toStep/
  )
  assert.throws(
    () => exportShapeToStl({}, { kernel: null }),
    /toStl/
  )
  assert.throws(
    () => exportShapeToBrep({}, { kernel: {} }),
    /toBrep/
  )
  assert.throws(
    () => createCadExportBlob('data', STEP_MIME_TYPE, null),
    /Blob support/
  )
  assert.throws(
    () => createCadExportObjectUrl('data', { url: {} }),
    /createObjectURL/
  )
  assert.throws(
    () => downloadCadExport('data', { document: null }),
    /document/
  )
})
