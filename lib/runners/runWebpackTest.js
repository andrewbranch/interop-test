const path = require("path");
const execNode = require("../helpers/execNode");
const runTest = require("../helpers/runTest");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  let webpack;
  await runTest({
    runtime,
    variant,
    packages: ["webpack"],
    ext,
    packageJsonType,
    setup: () => (webpack = require("webpack")),
    execute: async (filename, idx) => {
      const webpack4 = webpack.version.startsWith("4.");
      return new Promise((resolve) =>
        webpack(
          {
            mode: "production",
            entry: `./src/${filename}`,
            output: {
              path: path.resolve(__dirname, `../../dist/${idx}`),
            },
            target: "node",
            optimization: webpack4
              ? {
                  noEmitOnErrors: false,
                  minimize: false,
                }
              : {
                  emitOnErrors: true,
                  minimize: false,
                },
            ...(webpack4
              ? {}
              : {
                  experiments: { topLevelAwait: true },
                }),
          },
          (err, stats) => {
            if (err) return resolve("fatal error");
            resolve(
              (async () => {
                const result = await execNode(`dist/${idx}/main.js`);
                if (result.includes("error") && stats.hasErrors())
                  return "compilation error";
                return (
                  result +
                  (stats.hasErrors() ? " + errors" : "") +
                  (stats.hasWarnings() ? " + warnings" : "")
                );
              })()
            );
          }
        )
      );
    },
  });
};
