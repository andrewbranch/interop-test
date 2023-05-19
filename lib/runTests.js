const execNode = require("./helpers/execNode");
const path = require("path");

const variants = [
  'mjs',
  'js',
  'js-module',
  'mts',
  'ts',
  'ts-module',
];

const runtimes = [
  'node',
  'babel',
  'webpack',
  'rollup',
  'esbuild',
];

(async () => {
  for (const runtime of runtimes) {
    for (const variant of variants) {
      await execNode(`${path.join(__dirname, 'runTest.js')} ${runtime} ${variant}`);
    }
  }
})();
