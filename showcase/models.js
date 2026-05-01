export const showcaseModels = Object.freeze([
  {
    id: 'primitives',
    title: 'Primitive Set',
    level: 'Basic',
    format: 'HTML',
    source: './examples/primitives.html',
    summary: 'Centered cuboid, cylinder, sphere, cone, and torus primitives in a grouped model.'
  },
  {
    id: 'bracket',
    title: 'Parametric Bracket',
    level: 'Intermediate',
    format: 'HTML',
    source: './examples/bracket.html',
    summary: 'A CSG-style bracket made from cuboids and cylinders using union and difference.'
  },
  {
    id: 'gear',
    title: 'Notched Wheel',
    level: 'Intermediate',
    format: 'HTML',
    source: './examples/gear.html',
    summary: 'A wheel-like solid using repeated subtractive cuboids around a cylinder.'
  },
  {
    id: 'enclosure',
    title: 'Electronics Enclosure',
    level: 'Advanced',
    format: 'Component',
    source: './examples/enclosure.html',
    summary: 'A shell-oriented part with mounting posts, a hollowed interior, and chamfer intent.'
  },
  {
    id: 'lofted-handle',
    title: 'Lofted Handle Concept',
    level: 'Advanced',
    format: 'Component',
    source: './examples/lofted-handle.html',
    summary: 'A high-level feature example combining sketches, loft intent, and filleted supports.'
  },
  {
    id: 'profile-operations',
    title: 'Profile Operations',
    level: 'Advanced',
    format: 'HTML',
    source: './examples/profile-operations.html',
    summary: 'Sketch profiles turned into solids through extrusion, revolution, and path sweep.'
  }
])

export function getShowcaseModel (id) {
  return showcaseModels.find((model) => model.id === id) || showcaseModels[0]
}

export function listShowcaseSummaries () {
  return showcaseModels.map(({ id, title, level, format, source, summary }) => ({ id, title, level, format, source, summary }))
}

export async function loadShowcaseModel (id, { readText = readShowcaseSource } = {}) {
  const model = getShowcaseModel(id)
  const sourceText = await readText(model.source)

  return {
    ...model,
    markup: extractShowcaseMarkup(sourceText)
  }
}

export function extractShowcaseMarkup (sourceText) {
  const match = sourceText.match(/<([a-z][\w-]*)(?=[^>]*\sdata-showcase-model(?:[\s=>]|$))[^>]*>[\s\S]*?<\/\1>/i)

  if (!match) {
    throw new Error('Showcase document must contain an element marked with data-showcase-model')
  }

  return match[0].replace(/\sdata-showcase-model(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/, '').trim()
}

export async function readShowcaseSource (source) {
  const response = await fetch(source)

  if (!response.ok) {
    throw new Error(`Unable to load showcase source: ${source}`)
  }

  return response.text()
}

export function countModelTags (markup) {
  const counts = {}
  const pattern = /<\s*((?:sol|showcase)-[\w-]+)/g
  let match

  while ((match = pattern.exec(markup))) {
    counts[match[1]] = (counts[match[1]] || 0) + 1
  }

  return counts
}
