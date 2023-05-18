const execNode = require("./helpers/execNode");
const runTest = require("./helpers/runTest");

runTest({
  name: "node-js",
  ext: ".js",
  execute: async (filename) => {
    return await execNode(`src/${filename}`);
  },
});
