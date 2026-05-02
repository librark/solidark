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

it('rejects ambiguous multi-shape result export without grouping support', () => {
  assert.throws(
    () => exportResultToStep({ shapes: [{}, {}] }, { kernel: { toStep () {} } }),
    /multiple shapes/
  )
})

it('creates export blobs, object URLs, and browser downloads', () => {
  const created = []
  const revoked = []
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
    url
  })

  assert.equal(download.filename, 'model.brep')
  assert.equal(download.anchor.download, 'model.brep')
  assert.equal(download.anchor.rel, 'noreferrer')
  assert.equal(download.anchor.style.display, 'none')
  assert.deepEqual(clicks, ['blob:cad'])
  assert.equal(appended[0], download.anchor)
  assert.equal(download.anchor.removed, true)
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
    }
  }
  const bareDownload = downloadCadExport('data', { Blob: BlobStub, document: bareDocument, url: bareUrl })
  assert.equal(bareDownload.filename, 'solidark-export')
  assert.equal(bareDownload.anchor.download, 'solidark-export')
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
