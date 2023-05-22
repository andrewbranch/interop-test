const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const runTest = require("../helpers/runTest");
const execNode = require("../helpers/execNode");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  let babel;
  const sourceType = ext === ".mjs" ? "module" : "unambiguous";
  await runTest({
    runtime,
    variant,
    packages: [
      "@babel/cli",
      "@babel/core",
      "@babel/plugin-transform-modules-commonjs",
      "babel-plugin-dynamic-import-node",
    ],
    ext,
    packageJsonType,
    setup: () => {
      babel = require("@babel/core");
      fs.mkdirSync(path.resolve(__dirname, "../../dist/src"), {
        recursive: true,
      });
      childProcess.execSync(
        `yarn babel modules -d dist/modules --plugins=@babel/plugin-transform-modules-commonjs --plugins=babel-plugin-dynamic-import-node --source-type=${sourceType}`,
        {
          stdio: "inherit",
        }
      );
    },
    execute: async (filename, idx) => {
      let hasWarnings = false;
      try {
        const transformed = await babel.transformFileAsync(
          path.resolve(__dirname, `../../src/${filename}`),
          {
            plugins: [
              "@babel/plugin-transform-modules-commonjs",
              "babel-plugin-dynamic-import-node",
            ],
            sourceType,
          }
        );
        fs.writeFileSync(
          path.resolve(__dirname, `../../dist/src/${idx}.js`),
          transformed.code.replace(/\.mjs/g, ".js")
        );
      } catch (err) {
        console.log(err);
        return "compilation error";
      }
      return (
        (await execNode(`dist/src/${idx}.js`)) +
        (hasWarnings ? " + warnings" : "")
      );
    },
  });
};
