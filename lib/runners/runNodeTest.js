const execNode = require("../helpers/execNode");
const runTest = require("../helpers/runTest");

module.exports = async (name, ext, packageJsonType) => {
  await runTest({
    name,
    ext,
    packageJsonType,
    execute: async (filename) => {
      return await execNode(`src/${filename}`);
    },
  });
};
