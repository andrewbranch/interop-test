const execNode = require("./helpers/execNode");
const runTest = require("./helpers/runTest");

runTest({
  name: "node-mjs",
  ext: ".mjs",
  execute: async (filename) => {
    return await execNode(`src/${filename}`);
  },
});
