# ESM-CJS interop test

- [Results](#results)
  - [Node.js](#nodejs)
  - [Babel](#babel)
  - [Webpack](#webpack)
  - [Rollup.js](#rollup)
  - [esbuild](#esbuild)
- [Results by test case](#results-by-test-case)
- [Results by syntax](#results-by-syntax)
  - [`import x`](#import-x) and similar
  - [`import *`](#import--as-x) and similar
  - [`import()`](#import) and similar
  - [`require()`](#x--require) and similar
- [Direct differences](#direct-differences)
  - [Webpack <-> Node.js (`.mjs`)](#webpack---nodejs-mjs)
  - [Babel <-> Node.js (`.mjs`)](#babel---nodejs-mjs)
  - [Webpack `.mjs` <-> `.js`](#babel-mjs---js)
  - [Webpack `.mts` <-> `.mjs`](#webpack-mts---mjs)
  - [Webpack `.mts` <-> `.js`](#webpack-mts---js)
  - [Babel `.mjs` <-> `.js`](#webpack-mjs---js)
  - [esbuild `.mjs` <-> `.js`](#esbuild-mjs---js)
  - [esbuild `.mts` <-> `.ts`](#esbuild-mts---ts)
  - [esbuild `.mts` <-> `.mjs`](#esbuild-mts---mjs)

## Test fixtures

See [`modules` directory](https://github.com/sokra/interop-test/tree/main/modules) for details

- `default-export`
  - `exports.default = "default";`
- `named-and-default-export`
  - `exports.named = "named"; exports.default = "default";`
- `named-and-null-default-export`
  - `exports.named = "named"; exports.default = null;`
  - Is a falsy default export handled different from a truthy default export?
- `named-export`
  - `exports.named = "named";`
  - How are only named exports handled?
- `tla`
  - `await Promise.resolve();`
  - A module using top-level-await
  - Is this syntax supported?
- `order.js`
  - `exports.b = "b"; exports.a = "a"; exports.c = "c";`
  - Are exports in namespace objects alphabetically ordered?
- `single-`
  - `module.exports = ...`
  - How is a single `module.exports` export handled?
- `single-...-defined`
  - `Object.defineProperty(module, "exports", { value: ... })`
- `single-promise-`
  - `module.exports = Promise.resolve(...)`
  - Is a Promise handled when using `import()`?
  - Is it handled like Top-Level-Await when using `import`?
- `-esModule`
  - `Object.defineProperty(exports, "__esModule", { value: true });`
  - How is the default export handled with `__esModule`?
- `-non-enumerable`
  - Exports defined with `Object.defineProperty(exports, "name", { value: "value" });`
  - Does non-enumerable exports behave like normal exports?
- `-getter`
  - Exports defined with `Object.defineProperty(exports, "name", { get: () => "value" });`
  - Does getter exports behave like normal exports?
- `-inherited`
  - Exports set on the prototype of `exports`
  - Does inherited exports behave like normal exports?
- `-runtime`
  - Export keys and values not compile time constant, also for \_\_esModule
  - Is the behavior different when module is not statically analysable?
- `-live`
  - Exports are set one tick after module evaluation
  - Are exports live-bindings or copied after evaluation?
- `-esm-reexport`
  - Module is reexported via `export * from "..."`
  - Is there a behavior change from reexporting?
  - Is default export (incorrectly) exported?
- `-reexport`
  - Module is reexported via `module.export = require("...")`
  - Is there a behavior change from reexporting?
- `-esm`
  - An ESM module
  - How does the ESM module compare to the CommonJS equivalent?

## Results

For readablility some shortcuts are applied:

- `named`
  - `named: 'named'`
- `[named]`
  - `[named]: 'named'` (non enumerable)
- `default`
  - `default: 'default'`
- `[default]`
  - `[default]: 'default'` (non enumerable)
- `__esModule`
  - `__esModule: true`
- `[__esModule]`
  - `[__esModule]: true` (non enumerable)
- `[G]`
  - `[Getter]`
- `[Module]`
  - `[Symbol(Symbol.toStringTag)]: 'Module'`

### Node.js

#### `.mjs`

<!-- node-mjs results -->
<!-- end -->

#### `.js`

<!-- node-js results -->
<!-- end -->

### Babel

Babel behaves different depending on the file extension. If it is `.mjs`, it will compile in a `strictNamespace` mode.

#### `.mjs`

<!-- babel-mjs results -->
<!-- end -->

### Webpack

#### `.mjs`

<!-- webpack-mjs results -->
<!-- end -->

#### `.js`

<!-- webpack-js results -->
<!-- end -->

#### `.mts`

<!-- webpack-mts results -->
<!-- end -->

#### `.ts`

<!-- webpack-ts results -->
<!-- end -->

### Rollup

<!-- rollup-results -->
<!-- end -->

### esbuild

#### `.mjs`

<!-- esbuild-mjs results -->
<!-- end -->

#### `.js`

<!-- esbuild-js results -->
<!-- end -->

#### `.mts`

<!-- esbuild-mts results -->
<!-- end -->

#### `.ts`

<!-- esbuild-ts results -->
<!-- end -->

## Results by test case

- 💎 hard outlier
- 🟡 outlier
- ✅ very common value

<!-- module results -->
<!-- end -->

## Results by syntax

- 💎 hard outlier
- 🟡 outlier
- ✅ very common value

<!-- syntax results -->
<!-- end -->

## Direct differences

`import * as x` and `import()` are excluded from these tables as they are too different.

### Webpack <-> Node.js (`.mjs`)

When using `.mjs` Webpack tries to be compatible to Node.js.

<!-- diff-webpack-mjs-node-mjs results -->
<!-- end -->

### Babel <-> Node.js (`.mjs`)

When using `.mjs` Babel tries to be compatible to Node.js.

<!-- diff-babel-mjs-node-mjs results -->
<!-- end -->

### Babel `.mjs` <-> `.js`

<!-- diff-babel-mjs-babel-js results -->
<!-- end -->

### Webpack `.mjs` <-> `.js`

<!-- diff-webpack-mjs-webpack-js results -->
<!-- end -->

### Webpack `.mts` <-> `.mjs`

<!-- diff-webpack-mts-webpack-mjs results -->
<!-- end -->

### Webpack `.mts` <-> `.js`

<!-- diff-webpack-mts-webpack-js results -->
<!-- end -->

### esbuild `.mjs` <-> `.js`

<!-- diff-esbuild-mjs-esbuild-js results -->
<!-- end -->

### esbuild `.mts` <-> `.ts`

<!-- diff-esbuild-mts-esbuild-ts results -->
<!-- end -->

### esbuild `.mts` <-> `.mjs`

<!-- diff-esbuild-mts-esbuild-mjs results -->
<!-- end -->
