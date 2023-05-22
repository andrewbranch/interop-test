const execNode = require("../helpers/execNode");
const runTest = require("../helpers/runTest");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  await runTest({
    runtime,
    variant,
    ext,
    packageJsonType,
    execute: async (filename) => {
      return await execNode(`src/${filename}`);
    },
  });
};