const execBun = require("../helpers/execBun");
const runTest = require("../helpers/runTest");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  await runTest({
    runtime,
    variant,
    ext,
    packageJsonType,
    versions: {
      bun: (await execBun("--version")).replace(/[^0-9.]/g, "")
    },
    execute: async (filename) => {
      return await execBun(`src/${filename}`);
    },
  });
};
