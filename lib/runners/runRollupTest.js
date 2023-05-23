const runTest = require("../helpers/runTest");
const execNode = require("../helpers/execNode");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  let rollup, commonjs, typescript;
  const isTypeScript = ext === ".ts" || ext === ".mts";
  await runTest({
    runtime,
    variant,
    ext,
    packageJsonType,
    packages: ["rollup", "@rollup/plugin-commonjs", ...isTypeScript ? ["@rollup/plugin-typescript", "typescript", "tslib"] : []],
    setup: () => {
      rollup = require("rollup");
      commonjs = require("@rollup/plugin-commonjs")();
      typescript = isTypeScript ? require("@rollup/plugin-typescript")({
        compilerOptions: { module: "nodenext", allowJs: true, types: [], skipLibCheck: true },
        tsconfig: false,
      }) : undefined;
    },
    execute: async (filename, idx) => {
      let bundle;
      let hasWarnings = false;
      try {
        bundle = await rollup.rollup({
          input: `src/${filename}`,
          plugins: isTypeScript ? [commonjs, typescript] : [commonjs],
          external: ["util"],
          onwarn: (warning, warn) => {
            if (warning.pluginCode !== "TS5055") { // This is too annoying to fix
              hasWarnings = true;
            }
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
