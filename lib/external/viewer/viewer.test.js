import assert from 'node:assert/strict'
import { it } from 'node:test'

import { createElement } from '../../dom.js'
import { useInMemoryKernel } from '../../kernel/index.js'
import { ViewerComponent } from './viewer.js'

it('refreshes a referenced Solidark model into the viewer surface', async () => {
  const viewer = new ViewerComponent()
  const model = createElement('sol-model')
  const disposed = []
  const runtime = {
    async evaluate (target) {
      assert.equal(target, model)
      return {
        model: { tag: 'sol-model', implicitUnion: false },
        shapes: [],
        meshes: [],
        dispose () {
          disposed.push(target)
        }
      }
    }
  }

  const result = await viewer.refresh(model, { runtime })

  assert.equal(result.model.tag, 'sol-model')
  assert.match(viewer.innerHTML, /Solidark model preview/)
  assert.equal(viewer.clear(), viewer)
  assert.deepEqual(disposed, [model])
})

it('resolves model references by property or for attribute', async () => {
  const viewer = new ViewerComponent()
  const propertyModel = createElement('sol-model')
  const attributeModel = createElement('sol-model')
  const evaluated = []

  viewer.model = propertyModel
  assert.equal(viewer.resolveTarget(), propertyModel)

  delete viewer.model
  viewer.setAttribute('for', '#attribute-model')
  viewer.getRootNode = () => ({
    getElementById (id) {
      assert.equal(id, 'attribute-model')
      return attributeModel
    }
  })
  viewer.runtime = {
    async evaluate (target) {
      evaluated.push(target)
      return {
        model: { tag: 'sol-model', implicitUnion: false },
        shapes: [],
        meshes: []
      }
    }
  }

  assert.equal(viewer.resolveTarget(), attributeModel)
  await viewer.rendered
  await viewer.ready
  assert.deepEqual(evaluated, [attributeModel])
})

it('reports missing and failed model evaluation', async () => {
  const viewer = new ViewerComponent()
  const model = createElement('sol-model')
  const error = new Error('kernel failed')

  assert.equal(viewer.resolveTarget(), null)
  await assert.rejects(
    () => viewer.refresh(null, {
      runtime: {
        async evaluate () {
          return {}
        }
      }
    }),
    /requires a referenced Solidark model/
  )
  assert.match(viewer.textContent, /requires a referenced Solidark model/)

  await assert.rejects(
    () => viewer.refresh(model, {
      runtime: {
        async evaluate () {
          throw error
        }
      }
    }),
    error
  )
  assert.match(viewer.textContent, /kernel failed/)

  assert.equal(viewer.showError('bad input'), viewer)
  assert.equal(viewer.textContent, 'Evaluation failed: bad input')
})

it('uses the default runtime and resolves render errors', async () => {
  useInMemoryKernel()
  const defaultViewer = new ViewerComponent()
  const model = createElement('sol-model')
  const cuboid = createElement('sol-cuboid')

  model.appendChild(cuboid)
  assert.equal((await defaultViewer.refresh(model)).model.tag, 'sol-model')

  const failingViewer = new ViewerComponent()
  failingViewer.model = model
  failingViewer.runtime = {
    async evaluate () {
      throw new Error('render failed')
    }
  }

  assert.equal(failingViewer.render(), failingViewer)
  assert.equal(await failingViewer.ready, failingViewer)
  assert.match(failingViewer.textContent, /render failed/)
})
