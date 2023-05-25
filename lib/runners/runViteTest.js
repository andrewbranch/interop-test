const fs = require("fs");
const path = require("path");
const runTest = require("../helpers/runTest");
const execNode = require("../helpers/execNode");

module.exports = async (runtime, variant, ext, packageJsonType) => {
  /** @type {import("vite")} */
  let vite;
  let externalizeDeps;
  await runTest({
    runtime,
    variant,
    packages: ["vite", "vite-plugin-externalize-deps"],
    ext,
    packageJsonType,
    noRequireInHarness: true,
    setup: async () => {
      vite = require("vite");
      externalizeDeps = require("vite-plugin-externalize-deps").externalizeDeps;
    },
    execute: async (filename, idx) => {
      try {
        const outDir = path.resolve(__dirname, `../../dist/${idx}`);
        fs.writeFileSync(
          path.resolve(__dirname, `../../src/${idx}/index.html`),
          `<html><body><script type="module" src="./index${ext}"></script></body></html>`
        );
        const res = await vite.build({
          mode: "production",
          root: path.resolve(__dirname, `../../src/${idx}`),
          plugins: [externalizeDeps()],
          build: {
            outDir,
            commonjsOptions: {
              include: [/modules/]
            },
          }
        });
        fs.writeFileSync(
          path.resolve(__dirname, `../../dist/${idx}/package.json`),
          JSON.stringify({ type: "module" })
        );
        const indexFilePath = path.join(outDir, res.output.find(o => o.fileName.startsWith("assets/index")).fileName);
        const indexJs = fs.readFileSync(indexFilePath, "utf-8");
        if (indexJs.includes("require(")) {
          return "not fully bundled";
        }
        
        // Watch out, this is about to get wild
        fs.writeFileSync(
          path.join(outDir, "assets/run.js"),
          `const document = {
            createElement: () => ({
              relList: {
                supports: () => true
              }
            })
          };
          ${indexJs}`
        );

        return await execNode(`dist/${idx}/assets/run.js`);
      } catch (e) {
        console.error(e);
        return "compilation error";
      }
    }
  });
};
