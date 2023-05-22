const execNode = require("./helpers/execNode");
const path = require("path");
const { runtimes, variants } = require("./matrix");

(async () => {
  for (const runtime of runtimes) {
    for (const variant of variants) {
      await execNode(`${path.join(__dirname, 'runTest.js')} ${runtime} ${variant}`);
    }
  }
})();
