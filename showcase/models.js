import { html } from '../lib/index.js'

export const showcaseModels = Object.freeze([
  {
    id: 'primitives',
    title: 'Primitive Set',
    level: 'Basic',
    summary: 'Centered cuboid, cylinder, sphere, cone, and torus primitives in a grouped model.',
    markup: html`
      <sol-model id="primitive-set">
        <sol-group>
          <sol-translate by="-48 0 0">
            <sol-cuboid size="24 24 24"></sol-cuboid>
          </sol-translate>
          <sol-translate by="-18 0 0">
            <sol-cylinder radius="10" height="28"></sol-cylinder>
          </sol-translate>
          <sol-translate by="16 0 0">
            <sol-sphere radius="14"></sol-sphere>
          </sol-translate>
          <sol-translate by="48 0 0">
            <sol-cone radius1="12" radius2="4" height="30"></sol-cone>
          </sol-translate>
          <sol-translate by="82 0 0">
            <sol-torus major-radius="12" minor-radius="3"></sol-torus>
          </sol-translate>
        </sol-group>
      </sol-model>
    `
  },
  {
    id: 'bracket',
    title: 'Parametric Bracket',
    level: 'Intermediate',
    summary: 'A CSG-style bracket made from cuboids and cylinders using union and difference.',
    markup: html`
      <sol-model id="bracket">
        <sol-difference>
          <sol-union>
            <sol-cuboid size="90 18 12"></sol-cuboid>
            <sol-translate by="-36 0 22">
              <sol-cuboid size="18 18 44"></sol-cuboid>
            </sol-translate>
            <sol-translate by="36 0 22">
              <sol-cuboid size="18 18 44"></sol-cuboid>
            </sol-translate>
          </sol-union>
          <sol-translate by="-36 0 22">
            <sol-cylinder radius="5" height="28"></sol-cylinder>
          </sol-translate>
          <sol-translate by="36 0 22">
            <sol-cylinder radius="5" height="28"></sol-cylinder>
          </sol-translate>
        </sol-difference>
      </sol-model>
    `
  },
  {
    id: 'gear',
    title: 'Notched Wheel',
    level: 'Intermediate',
    summary: 'A wheel-like solid using repeated subtractive cuboids around a cylinder.',
    markup: html`
      <sol-model id="notched-wheel">
        <sol-difference>
          <sol-cylinder radius="36" height="10"></sol-cylinder>
          <sol-cylinder radius="10" height="18"></sol-cylinder>
          <sol-rotate by="0 0 0">
            <sol-translate by="36 0 0">
              <sol-cuboid size="14 8 18"></sol-cuboid>
            </sol-translate>
          </sol-rotate>
          <sol-rotate by="0 0 45">
            <sol-translate by="36 0 0">
              <sol-cuboid size="14 8 18"></sol-cuboid>
            </sol-translate>
          </sol-rotate>
          <sol-rotate by="0 0 90">
            <sol-translate by="36 0 0">
              <sol-cuboid size="14 8 18"></sol-cuboid>
            </sol-translate>
          </sol-rotate>
          <sol-rotate by="0 0 135">
            <sol-translate by="36 0 0">
              <sol-cuboid size="14 8 18"></sol-cuboid>
            </sol-translate>
          </sol-rotate>
        </sol-difference>
      </sol-model>
    `
  },
  {
    id: 'enclosure',
    title: 'Electronics Enclosure',
    level: 'Advanced',
    summary: 'A shell-oriented part with mounting posts, chamfer intent, and imported-board placeholder.',
    markup: html`
      <sol-model id="electronics-enclosure">
        <sol-chamfer distance="1.5">
          <sol-difference>
            <sol-union>
              <sol-cuboid size="120 70 24"></sol-cuboid>
              <sol-translate by="-44 -22 18">
                <sol-cylinder radius="6" height="24"></sol-cylinder>
              </sol-translate>
              <sol-translate by="44 -22 18">
                <sol-cylinder radius="6" height="24"></sol-cylinder>
              </sol-translate>
              <sol-translate by="-44 22 18">
                <sol-cylinder radius="6" height="24"></sol-cylinder>
              </sol-translate>
              <sol-translate by="44 22 18">
                <sol-cylinder radius="6" height="24"></sol-cylinder>
              </sol-translate>
            </sol-union>
            <sol-cuboid size="108 58 20"></sol-cuboid>
            <sol-stl src="board-placeholder.stl"></sol-stl>
          </sol-difference>
        </sol-chamfer>
      </sol-model>
    `
  },
  {
    id: 'lofted-handle',
    title: 'Lofted Handle Concept',
    level: 'Advanced',
    summary: 'A high-level feature example combining sketches, loft intent, and filleted supports.',
    markup: html`
      <sol-model id="lofted-handle">
        <sol-fillet radius="3">
          <sol-union>
            <sol-loft ruled>
              <sol-sketch>
                <sol-move point="-28 -8"></sol-move>
                <sol-line point="28 -8"></sol-line>
                <sol-line point="28 8"></sol-line>
                <sol-line point="-28 8"></sol-line>
                <sol-close></sol-close>
              </sol-sketch>
              <sol-translate by="0 0 34">
                <sol-sketch>
                  <sol-move point="-18 -6"></sol-move>
                  <sol-line point="18 -6"></sol-line>
                  <sol-line point="18 6"></sol-line>
                  <sol-line point="-18 6"></sol-line>
                  <sol-close></sol-close>
                </sol-sketch>
              </sol-translate>
            </sol-loft>
            <sol-translate by="-36 0 0">
              <sol-cylinder radius="7" height="16"></sol-cylinder>
            </sol-translate>
            <sol-translate by="36 0 0">
              <sol-cylinder radius="7" height="16"></sol-cylinder>
            </sol-translate>
          </sol-union>
        </sol-fillet>
      </sol-model>
    `
  }
])

export function getShowcaseModel (id) {
  return showcaseModels.find((model) => model.id === id) || showcaseModels[0]
}

export function listShowcaseSummaries () {
  return showcaseModels.map(({ id, title, level, summary }) => ({ id, title, level, summary }))
}

export function countModelTags (markup) {
  const counts = {}
  const pattern = /<\s*(sol-[\w-]+)/g
  let match

  while ((match = pattern.exec(markup))) {
    counts[match[1]] = (counts[match[1]] || 0) + 1
  }

  return counts
}
