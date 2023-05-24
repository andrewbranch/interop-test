const fs = require("fs");
const path = require("path");
const runTest = require("../helpers/runTest");
const execNode = require("../helpers/execNode");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  let Parcel;
  runTest({
    runtime,
    variant,
    packages: [
      "@parcel/core@2.0.0-nightly.1312",
      "@parcel/config-default@2.0.0-nightly.1314",
    ],
    ext,
    packageJsonType,
    noParallel: true,
    setup: () => {
      Parcel = require("@parcel/core").default;
    },
    execute: (filename, idx) =>
      Promise.race([
        (async () => {
          let hasWarnings = false;
          try {
            const parcelrcContent = {
              extends: "@parcel/config-default",
              transformers: {
                "*.{js,mjs,jsm,jsx,es6,cjs,ts,tsx,mts,cts}": [
                  "@parcel/transformer-babel",
                  "@parcel/transformer-js",
                ]
              },
            };
            fs.writeFileSync(
              path.resolve(__dirname, `../../src/${idx}/.parcelrc`),
              JSON.stringify(parcelrcContent)
            );
            let bundler = new Parcel({
              entries: path.resolve(__dirname, `../../src/${filename}`),
              config: path.resolve(__dirname, `../../src/${idx}/.parcelrc`),
              cacheDir: path.resolve(__dirname, `../../src/${idx}/.parce-cache`),
              targets: {
                main: {
                  engines: {
                    node: "14",
                  },
                  distDir: path.resolve(__dirname, `../../dist/${idx}`),
                },
              },
            });

            await bundler.run();
          } catch (err) {
            console.log(err);
            return "compilation error";
          }
          return (
            (await execNode(`dist/${idx}/index.js`)) +
            (hasWarnings ? " + warnings" : "")
          );
        })(),
        new Promise((resolve) =>
          setTimeout(() => resolve("timeout error"), 10000)
        ),
      ]),
  });
};
