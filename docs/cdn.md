# CDN Usage

Solidark can run from a plain HTML file through a CDN such as unpkg. This is the
simplest path for sketches, demos, documentation, and examples that should not
require a local npm install or bundler.

## Standalone HTML

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Solidark CDN Model</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      sol-model { display: none; }
      sol-viewer { display: block; width: 100vw; height: 100vh; }
      .solidark-cad-viewer,
      .solidark-cad-viewport,
      .solidark-cad-canvas,
      .solidark-viewer-canvas { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <sol-model id="model">
      <sol-color value="#6f92c9">
        <sol-difference>
          <sol-cuboid size="80 40 8"></sol-cuboid>
          <sol-cylinder radius="5" height="24"></sol-cylinder>
        </sol-difference>
      </sol-color>
    </sol-model>

    <sol-viewer for="model" edges grid></sol-viewer>

    <script type="module">
      import { bootSolidarkCdn } from "https://unpkg.com/@librark/solidark@0.1.0";

      await bootSolidarkCdn();
    </script>
  </body>
</html>
```

This module configures:

- Solidark built-in custom elements.
- OpenCascade.js from `https://unpkg.com/opencascade.js@1.1.1`.
- OpenCascade's `.wasm` asset from the matching CDN package.
- Three.js from `https://unpkg.com/three@0.172.0`.

## Options

```js
await bootSolidarkCdn({
  loadThree: false,
  kernel: "memory"
});
```

Useful options:

- `loadThree: false`: skip Three.js and use the built-in canvas/SVG viewer path.
- `kernel: "memory"`: use descriptor-only evaluation for demos that do not need
  OpenCascade geometry.
- `threeUrl`: override the Three.js module URL.
- `openCascadeModuleUrl`: override the OpenCascade.js module URL.
- `openCascadeWasmUrl`: override the OpenCascade WebAssembly URL.
- `initOptions`: pass additional OpenCascade initialization options.

## Version Pinning

Pin CDN URLs to an explicit Solidark version for reproducible examples:

```js
import { bootSolidarkCdn } from "https://unpkg.com/@librark/solidark@0.1.0";
```

Use `@latest` only for quick experiments.
