import { Component, html } from '../../../lib/index.js'

export class ShowcaseEnclosureComponent extends Component {
  static tag = 'showcase-enclosure'

  render () {
    this.content = html`
      <sol-model>
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
    return this
  }
}

ShowcaseEnclosureComponent.define()
