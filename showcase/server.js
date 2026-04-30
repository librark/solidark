import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.wasm': 'application/wasm'
}

export function createShowcaseServer ({
  root = resolve(import.meta.dirname, '..'),
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT || 4173),
  serverFactory = createServer
} = {}) {
  const server = serverFactory(createShowcaseHandler({ root }))

  return {
    host,
    port,
    server,
    listen () {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => {
          server.off('error', reject)
          resolve(`http://${host}:${server.address().port}/showcase/`)
        })
      })
    },
    close () {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  }
}

export function createShowcaseHandler ({
  root,
  statFile = stat,
  readFileContent = readFile
}) {
  return async function showcaseHandler (request, response) {
    const file = resolveRequestPath(root, request.url || '/')

    try {
      const info = await statFile(file)
      const finalFile = info.isDirectory() ? join(file, 'index.html') : file
      response.writeHead(200, { 'content-type': contentType(finalFile) })
      response.end(await readFileContent(finalFile))
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    }
  }
}

export function resolveRequestPath (root, url) {
  const pathname = new URL(url, 'http://localhost').pathname
  const relative = pathname === '/' ? '/showcase/index.html' : pathname
  return resolve(root, `.${normalize(relative)}`)
}

export function contentType (file) {
  return types[extname(file)] || 'application/octet-stream'
}

/* node:coverage ignore next 5 */
if (process.argv[1] === import.meta.filename) {
  const app = createShowcaseServer()
  const url = await app.listen()
  console.log(`Solidark showcase running at ${url}`)
}
