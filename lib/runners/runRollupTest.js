const runTest = require("../helpers/runTest");
const execNode = require("../helpers/execNode");

module.exports = async (name, ext, packageJsonType) => {
  let rollup;
  let commonjs;
  await runTest({
    name,
    ext,
    packageJsonType,
    packages: ["rollup", "@rollup/plugin-commonjs"],
    setup: () => {
      rollup = require("rollup");
      commonjs = require("@rollup/plugin-commonjs");
    },
    execute: async (filename, idx) => {
      let bundle;
      let hasWarnings = false;
      try {
        bundle = await rollup.rollup({
          input: `src/${filename}`,
          plugins: [commonjs()],
          external: ["util"],
          onwarn: (warning, warn) => {
            hasWarnings = true;
          },
        });
        await bundle.write({
          dir: `dist/${idx}`,
          format: "cjs",
          exports: "auto",
        });
      } catch (err) {
        return "compilation error";
      }
      return (
        (await execNode(`dist/${idx}/index.js`)) +
        (hasWarnings ? " + warnings" : "")
      );
    },
  });
};
