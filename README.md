# solidark

Solidark is a JavaScript CAD library built around Web Components,
Constructive Solid Geometry, and an OpenCascade.js-backed runtime.

Models are ordinary custom element trees. You can write them directly in HTML or
generate them from JavaScript components, evaluate them with a kernel, preview
them in the browser, and export common CAD or mesh formats.

## Install

```sh
npm install @librark/solidark
```

Solidark is ESM-only. Browser usage with OpenCascade.js usually needs the
OpenCascade WebAssembly file to be served by your app or development server.

## Quick Start

```html
<sol-model id="bracket">
  <sol-color value="#6f92c9">
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
        <sol-rotate by="90 0 0">
          <sol-cylinder radius="5" height="28"></sol-cylinder>
        </sol-rotate>
      </sol-translate>
      <sol-translate by="36 0 22">
        <sol-rotate by="90 0 0">
          <sol-cylinder radius="5" height="28"></sol-cylinder>
        </sol-rotate>
      </sol-translate>
    </sol-difference>
  </sol-color>
</sol-model>

<sol-viewer for="bracket"></sol-viewer>

<script type="module">
  import { defineSolidarkElements } from "@librark/solidark/elements";
  import { SolidarkRuntime } from "@librark/solidark/runtime";
  import { createOpenCascadeKernel } from "@librark/solidark/kernel";

  defineSolidarkElements();

  SolidarkRuntime.configure({
    loader: () => createOpenCascadeKernel({
      initOptions: {
        locateFile(path) {
          return path.endsWith(".wasm")
            ? "/node_modules/opencascade.js/dist/opencascade.wasm.wasm"
            : path;
        }
      }
    })
  });
</script>
```

For fast tests and descriptor-only model inspection, use the in-memory kernel:

```js
import { SolidarkRuntime } from "@librark/solidark/runtime";
import { useInMemoryKernel } from "@librark/solidark/kernel";

SolidarkRuntime.configure({ kernel: useInMemoryKernel() });
```

## Components

Custom parametric parts extend `Component` and render Solidark markup into their
own `content`.

```js
import { Component, html } from "@librark/solidark/component";

export class MountingPlate extends Component {
  static tag = "mounting-plate";

  static defaultProperties = {
    width: 80,
    depth: 40,
    height: 8,
    holeRadius: 4
  };

  render() {
    const { width, depth, height, holeRadius } = this.properties;

    this.content = html`
      <sol-difference>
        <sol-cuboid size="${width} ${depth} ${height}"></sol-cuboid>
        <sol-cylinder
          radius="${holeRadius}"
          height="${height * 3}"
        ></sol-cylinder>
      </sol-difference>
    `;

    return this;
  }
}

MountingPlate.define();
```

## Public Entrypoints

Use these package entrypoints instead of importing from internal files:

| Entrypoint | Purpose |
| --- | --- |
| `@librark/solidark` | Core authoring and runtime convenience exports. |
| `@librark/solidark/component` | `Component`, `SolidarkChildGeometryError`, and template helpers. |
| `@librark/solidark/elements` | Built-in component classes and `defineSolidarkElements()`. |
| `@librark/solidark/runtime` | Evaluation runtime, scheduling, diagnostics, and topology selectors. |
| `@librark/solidark/kernel` | In-memory and OpenCascade kernel adapters. |
| `@librark/solidark/viewer` | Browser viewer component and renderer helpers. |
| `@librark/solidark/export` | GLB, STL, STEP, and BREP export helpers. |
| `@librark/solidark/robot` | Robot extension elements and deterministic robot definition exports. |

See [docs/api.md](docs/api.md) for the supported exports in each vertical.

## Exporting

```js
import { SolidarkRuntime } from "@librark/solidark/runtime";
import { exportResultToStl } from "@librark/solidark/export";

const model = document.querySelector("sol-model");
const result = await SolidarkRuntime.evaluate(model);
const stl = exportResultToStl(result);
```

`exportResultToStep()` and `exportResultToBrep()` require a kernel that supports
those exact CAD export operations. STL can be produced from evaluated meshes
when they are present.

## Local Development

```sh
npm install
npm test
npm run test:coverage
npm run standard
npm run showcase
```

Before publishing, run:

```sh
npm run release:check
```

The showcase server prints a local URL with browser examples.
