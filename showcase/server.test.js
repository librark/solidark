import assert from 'node:assert/strict'
import { it } from 'node:test'

import { contentType, createShowcaseHandler, createShowcaseServer, resolveRequestPath } from './server.js'

it('resolves request paths inside the project root', () => {
  const root = '/workspace/project'

  assert.equal(resolveRequestPath(root, '/'), '/workspace/project/showcase/index.html')
  assert.equal(resolveRequestPath(root, '/showcase/main.js'), '/workspace/project/showcase/main.js')
  assert.equal(resolveRequestPath(root, '/../secret'), '/workspace/project/secret')
})

it('returns content types by extension', () => {
  assert.equal(contentType('index.html'), 'text/html; charset=utf-8')
  assert.equal(contentType('style.css'), 'text/css; charset=utf-8')
  assert.equal(contentType('main.js'), 'text/javascript; charset=utf-8')
  assert.equal(contentType('data.json'), 'application/json; charset=utf-8')
  assert.equal(contentType('icon.svg'), 'image/svg+xml; charset=utf-8')
  assert.equal(contentType('opencascade.wasm.wasm'), 'application/wasm')
  assert.equal(contentType('part.stl'), 'application/octet-stream')
})

it('serves showcase files and 404 responses through the handler', async () => {
  const responses = []
  const handler = createShowcaseHandler({
    root: '/workspace/project',
    async statFile (file) {
      if (file.endsWith('missing.txt')) {
        throw new Error('missing')
      }

      return { isDirectory: () => file.endsWith('/showcase') }
    },
    async readFileContent (file) {
      return file.endsWith('index.html') ? '<h1>Showcase</h1>' : 'console.log("ok")'
    }
  })

  await handler({ url: '/showcase/' }, createResponse(responses))
  await handler({ url: '/showcase/main.js' }, createResponse(responses))
  await handler({}, createResponse(responses))
  await handler({ url: '/showcase/missing.txt' }, createResponse(responses))

  assert.deepEqual(responses, [
    [200, { 'content-type': 'text/html; charset=utf-8' }, '<h1>Showcase</h1>'],
    [200, { 'content-type': 'text/javascript; charset=utf-8' }, 'console.log("ok")'],
    [200, { 'content-type': 'text/html; charset=utf-8' }, '<h1>Showcase</h1>'],
    [404, { 'content-type': 'text/plain; charset=utf-8' }, 'Not found']
  ])
})

it('creates a listenable server wrapper', async () => {
  const events = {}
  const app = createShowcaseServer({
    root: '/workspace/project',
    port: 9876,
    serverFactory () {
      return {
        once (event, handler) {
          events[event] = handler
        },
        off (event) {
          delete events[event]
        },
        listen (port, host, callback) {
          assert.equal(port, 9876)
          assert.equal(host, '127.0.0.1')
          callback()
        },
        address () {
          return { port: 9876 }
        },
        close (callback) {
          callback()
        }
      }
    }
  })

  assert.equal(app.port, 9876)
  assert.equal(app.host, '127.0.0.1')
  assert.equal(await app.listen(), 'http://127.0.0.1:9876/showcase/')
  assert.deepEqual(events, {})
  await app.close()
})

it('creates servers with default and environment ports without listening', () => {
  const originalPort = process.env.PORT
  const originalHost = process.env.HOST
  const app = createShowcaseServer()

  process.env.PORT = '4321'
  process.env.HOST = 'localhost'
  const configured = createShowcaseServer({
    root: '/workspace/project',
    serverFactory: createFakeServer
  })

  if (originalPort === undefined) {
    delete process.env.PORT
  } else {
    process.env.PORT = originalPort
  }

  if (originalHost === undefined) {
    delete process.env.HOST
  } else {
    process.env.HOST = originalHost
  }

  assert.equal(app.port, 4173)
  assert.equal(typeof app.server.listen, 'function')
  assert.equal(configured.port, 4321)
  assert.equal(configured.host, 'localhost')
})

it('rejects listen and close failures', async () => {
  const closeError = new Error('close failed')
  const listenError = new Error('listen failed')
  const app = createShowcaseServer({
    root: '/workspace/project',
    port: 1234,
    serverFactory () {
      return {
        once (event, handler) {
          this.errorHandler = handler
        },
        off () {},
        listen () {
          this.errorHandler(listenError)
        },
        address () {
          return { port: 1234 }
        },
        close (callback) {
          callback(closeError)
        }
      }
    }
  })

  await assert.rejects(() => app.listen(), listenError)
  await assert.rejects(() => app.close(), closeError)
})

function createFakeServer () {
  return {
    once () {},
    listen () {},
    close () {}
  }
}

function createResponse (responses) {
  let status = 0
  let headers = {}

  return {
    writeHead (nextStatus, nextHeaders) {
      status = nextStatus
      headers = nextHeaders
    },
    end (body) {
      responses.push([status, headers, String(body)])
    }
  }
}
