const execNode = require("./helpers/execNode");
const path = require("path");
const { runtimes, variants } = require("./matrix");
const [runtimeArg] = process.argv.slice(2);

(async () => {
  for (const runtime in runtimes) {
    if (runtimeArg && runtime !== runtimeArg) continue;
    for (const variant in variants) {
      await execNode(`${path.join(__dirname, 'runTest.js')} ${runtime} ${variant}`);
    }
  }
})();
