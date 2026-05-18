# Release Checklist

Use this checklist before publishing a Solidark version externally.

## Package Boundary

- Keep `package.json` exports limited to the documented public entrypoints.
- Do not expose internal source folders with wildcard subpaths.
- Confirm every public entrypoint has a matching declaration file.
- Run `npm pack --dry-run` and inspect the file list.

## Verification

```sh
npm run standard
npm run test:coverage
npm run pack:check
```

The combined gate is:

```sh
npm run release:check
```

## Consumer Smoke Test

Before publishing, install the packed tarball into a fresh project and verify:

- `import { Component } from "@librark/solidark/component"` works.
- `import { defineSolidarkElements } from "@librark/solidark/elements"` works.
- `import { SolidarkRuntime } from "@librark/solidark/runtime"` works.
- `import { createOpenCascadeKernel } from "@librark/solidark/kernel"` works.
- `import { bootSolidarkCdn } from "@librark/solidark/cdn"` works.
- A simple `<sol-model>` evaluates with either the in-memory kernel or
  OpenCascade.js.
- `npm pack --dry-run` does not include test files.

## Publish

```sh
npm publish --access public
```

Tag the published commit after npm accepts the version.
