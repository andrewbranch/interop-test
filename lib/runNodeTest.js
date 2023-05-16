const execNode = require("./helpers/execNode");
const runTest = require("./helpers/runTest");

runTest({
  name: process.version.startsWith("v18.") ? "node-lts" : "node",
  execute: async (filename) => {
    return await execNode(`src/${filename}`);
  },
});
