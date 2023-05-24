const execBun = require("../helpers/execBun");
const runTest = require("../helpers/runTest");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  await runTest({
    runtime,
    variant,
    ext,
    packageJsonType,
    execute: async (filename) => {
      return await execBun(`src/${filename}`);
    },
  });
};
