import { Component, html } from '../../../lib/base/index.js'

export class ShowcaseLoftedHandleComponent extends Component {
  static tag = 'showcase-lofted-handle'

  render () {
    this.content = html`
      <sol-model>
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
    return this
  }
}

ShowcaseLoftedHandleComponent.define()
