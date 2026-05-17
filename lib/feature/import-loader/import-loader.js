export const inlineImportProperties = ['data', 'source', 'content', 'text']
export const importObservedAttributes = ['src', 'href', ...inlineImportProperties]

export function loadRemoteImport (element, format) {
  return loadImport(element, String(format).toUpperCase())
}

async function loadImport (element, format) {
  const properties = element.properties
  const url = properties.src ?? properties.href

  if (hasInlineImportSource(element, properties) || url === undefined) {
    return element
  }

  if (element._importFetchedFrom === String(url) && element.data === element._importFetchedData) {
    return element
  }

  const response = await fetchImport(element, String(url), format)

  if (response.ok === false) {
    throw new Error(`Unable to fetch ${format} ${url}: ${response.status || ''} ${response.statusText || ''}`.trim())
  }

  const data = await responseData(response)

  element.data = data
  element._importFetchedData = data
  element._importFetchedFrom = String(url)
  await element.scheduleUpdate()
  return element
}

function hasInlineImportSource (element, properties) {
  return inlineImportProperties.some((name) => {
    return properties[name] !== undefined && properties[name] !== element._importFetchedData
  })
}

function fetchImport (element, url, format) {
  const fetcher = element.fetch || globalThis.fetch

  if (typeof fetcher !== 'function') {
    throw new Error(`Unable to fetch ${format} ${url}: fetch is not available`)
  }

  return fetcher(url)
}

async function responseData (response) {
  if (typeof response.arrayBuffer === 'function') {
    return new Uint8Array(await response.arrayBuffer())
  }

  return response.text()
}
