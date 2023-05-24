const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const {
  formatTable,
  dedupeLines,
  transpose,
  comparator,
} = require("./tableUtils");

const root = path.resolve(__dirname, "../../");
const src = path.resolve(root, "src");
const resultsDir = path.resolve(root, "results");

const removeMjs = (data) => {
  const header = data[0];
  for (let i = 0; i < header.length; i++) {
    if (header[i].endsWith(" (mjs)")) header[i] = header[i].slice(0, -6);
  }
};

const print = (expr) =>
  `Promise.resolve().then(() => {}).then(() => console.log(util.inspect(${expr}, { showHidden: true, breakLength: Infinity, compact: true, getters: true })))`;

/**
 * @typedef {{
 *   runtime: string;
 *   variant: string;
 *   packages?: string[];
 *   ext?: string;
 *   packageJsonType?: "module" | "commonjs";
 *   setup?: () => unknown;
 *   teardown?: () => unknown;
 *   execute: (filename: string, idx: number) => Promise<string>;
 *   noParallel?: boolean;
 * }} RunTestOptions
 */

/**
 * 
 * @param {RunTestOptions} options
 */
module.exports = async ({
  runtime,
  variant,
  packages,
  ext = ".mjs",
  packageJsonType,
  setup,
  teardown,
  execute,
  noParallel,
}) => {
  const name = `${runtime}.${variant}`;
  try {
    if (fs.rmSync) {
      fs.rmSync(path.resolve(root, "dist"), {
        recursive: true,
        force: true,
      });
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      fs.rmdirSync(path.resolve(root, "dist"), { recursive: true });
      fs.rmdirSync(src, { recursive: true });
    }
    fs.mkdirSync(src, { recursive: true });

    let versions = [];

    if (packages) {
      childProcess.execSync(`yarn add ${packages.join(" ")}`, {
        stdio: "inherit",
      });

      versions = JSON.parse(
        childProcess.execSync(
          `yarn list ${packages
            .map((p) => p.replace(/(?<!^)@.+$/, ""))
            .join(" ")} --depth=0 --json`,
          {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
          }
        )
      ).data.trees.map((tree) => tree.name);
    }
    versions.push(`node@${process.version.slice(1)}`);

    if (setup) await setup();

    let total = 0;
    let results = [];

    try {
      const syntaxCases = (filename) => [
        ["import x", `import x from "${filename}"; ${print("x")};`],
        [
          "import().default",
          `import("${filename}").then(x => { ${print(
            "x.default"
          )}; }).catch(err => { console.error(err); process.exitCode = 1; });`,
        ],
        ["x = require()", `const x = require("${filename}"); ${print("x")};`],
        [
          "await import() === require()",
          `import("${filename}").then(x => { const y = require("${filename}"); ${print(
            "x === y"
          )}; }).catch(err => { console.error(err); process.exitCode = 1; });`,
        ],
        [
          "import * as x; x === await import()",
          `import * as x from "${filename}"; import("${filename}").then(y => { ${print(
            "x === y"
          )}; }).catch(err => { console.error(err); process.exitCode = 1; });`,
        ],
      ];

      const modules = fs
        .readdirSync(path.resolve(src, "../modules"))
        .filter((name) => !name.startsWith("_"))
        .sort(comparator);

      {
        const header = [name];
        for (const [name] of syntaxCases("...")) {
          header.push(`\`${name}\``);
          total += modules.length;
        }
        results.push(header);
      }

      let done = 0;
      let reportedTestError = false;
      for (const moduleName of modules) {
        const testCases = syntaxCases(`../../modules/${moduleName}`);
        const syntaxResults = await mapAsync(testCases, !noParallel, async ([name, content], idx) => {
          const requireTest = name.includes("require()");
          const testFilename = `${idx}/index${ext}`;
          const packageJsonContent = {
            ...packageJsonType ? { type: packageJsonType } : undefined,
          };
          fs.mkdirSync(path.resolve(src, "" + idx), { recursive: true });
          fs.writeFileSync(
            path.resolve(src, `${idx}/package.json`),
            JSON.stringify(packageJsonContent, null, 2)
          );
          fs.writeFileSync(
            path.resolve(src, testFilename),
            requireTest
              ? 'const util = require("util");\n' + content + "\n"
              : 'import util from "util";\n' + content + "\nexport {};"
          );
          let output = "??";
          try {
            output = await execute(testFilename, idx);
          } catch (err) {
            if (!reportedTestError) {
              console.error(err);
              reportedTestError = true;
            }
            output = "test error";
          }
          fs.unlinkSync(path.resolve(src, testFilename));
          fs.unlinkSync(path.resolve(src, `${idx}/package.json`));
          const result = output
            .replace(/\n/g, " ")
            .replace(/``/g, "` `")
            .replace(/<Inspection threw \([^)]+\)>/g, "<Inspection threw>")
            .replace(/__esModule: true/g, "__esModule")
            .replace(/\[__esModule\]: true/g, "[__esModule]")
            .replace(/named: 'named'/g, "named")
            .replace(/\[named\]: 'named'/g, "[named]")
            .replace(/named: \[Getter: 'named'\]/g, "named: [G]")
            .replace(/\[named\]: \[Getter: 'named'\]/g, "[named]: [G]")
            .replace(/a: 'a'/g, "a")
            .replace(/a: \[Getter 'a'\]/g, "a: [G]")
            .replace(/b: 'b'/g, "b")
            .replace(/b: \[Getter 'b'\]/g, "b: [G]")
            .replace(/c: 'c'/g, "c")
            .replace(/c: \[Getter 'c'\]/g, "c: [G]")
            .replace(/default: 'default'/g, "default")
            .replace(/\[default\]: 'default'/g, "[default]")
            .replace(/default: \[Getter: 'default'\]/g, "default: [G]")
            .replace(
              /\[default\]: \[Getter: 'default'\]/g,
              "[default]: [G]"
            )
            .replace(/\[Getter([:\]])/g, "[G$1")
            .replace(
              /\[Symbol\(Symbol\.toStringTag\)\]: 'Module'/g,
              "[Module]"
            );
          done++;
          process.stderr.write(
            `${Math.round((done / total) * 100)}% (${done}/${total})  \r`
          );
          return result;
        });
        results.push([moduleName, ...syntaxResults]);
      }
      process.stderr.write("\n");
    } finally {
      if (teardown) await teardown();
    }

    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(resultsDir, `${name}.json`),
      JSON.stringify(results, null, 2)
    );

    results = dedupeLines(results);
    results = transpose(results);
    results = dedupeLines(results);
    results = transpose(results);

    const output = formatTable(results);

    let readme = fs.readFileSync(path.resolve(root, "README.md"), "utf-8");
    readme = readme.replace(
      new RegExp(`<!-- ${name} results -->.*?<!-- end -->`, "ms"),
      `<!-- ${name} results -->\n\nVersion: ${versions
        .map((v) => `\`${v}\``)
        .join(" ")}\n\n${output}\n\n<!-- end -->`
    );
    fs.writeFileSync(path.resolve(root, "README.md"), readme);

    const data = require("../../package.json");
    delete data.dependencies;
    fs.writeFileSync(
      path.resolve(root, "package.json"),
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.error(err);
  }
};

/**
 * @template T, U
 * @param {T[]} array
 * @param {boolean} allowParallel
 * @param {(item: T, index: number, array: T[]) => Promise<U>} cb
 * @returns {Promise<U[]>}
 */
async function mapAsync(array, allowParallel, cb) {
  if (allowParallel) {
    return Promise.all(array.map(cb));
  } else {
    const result = [];
    for (let i = 0; i < array.length; i++) {
      result.push(await cb(array[i], i, array));
    }
    return result;
  }
}
