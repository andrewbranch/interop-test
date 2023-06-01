const { dedupeLines, transpose, formatTable, removeIdenticalLines, splitCombinedHeader, swapColumns } = require("./helpers/tableUtils");

const fs = require("fs");
const path = require("path");
const { variants, runtimes } = require("./matrix");
const runtimeVersions = {};

const resultsFiles = fs.readdirSync(path.resolve(__dirname, "../results"))
  .sort((a, b) => {
  const [aRuntime, aVariant] = a.split(".");
  const [bRuntime, bVariant] = b.split(".");
  if (aRuntime === bRuntime) {
    return Object.keys(variants).indexOf(aVariant) - Object.keys(variants).indexOf(bVariant);
  }
  return Object.keys(runtimes).indexOf(aRuntime) - Object.keys(runtimes).indexOf(bRuntime);
});

const headers = new Set();
let modules = new Set();
const allData = [];
/** @type {[string, any][]} */
const allDataTransposed = [];

const runtimeResults = {};
for (const file of resultsFiles) {
  const [runtime, variant] = file.split(".");
  const name = `${runtime}.${variant}`;
  let { results: data, versions } = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../results", file), "utf-8")
  );

  for (const header of data[0].slice(1)) {
    headers.add(header);
  }
  for (const [module] of data.slice(1)) {
    modules.add(module);
  }
  runtimeVersions[runtime] = versions[runtimes[runtime].versionPackage ?? runtime];
  allData.push([name, data]);
  allDataTransposed.push([name, transpose(data)]);

  data = dedupeLines(data);
  data = transpose(data);
  data = dedupeLines(data);
  data = transpose(data);
  data[0][0] = formatResultKeyShort(name);
  const table = formatTable(data);
  runtimeResults[name] = {
    table,
    versions,
  };
}

modules = new Set(Array.from(modules).sort((a, b) => {
  a = a.replace(/\.m?jso?n?$/, "");
  b = b.replace(/\.m?jso?n?$/, "");
  if (a.startsWith(b)) return 1;
  if (b.startsWith(a)) return -1;
  return a < b ? -1 : a === b ? 0 : 1;
}));

const moduleResults = {};
for (const module of modules) {
  let results = [];
  results.push([module, ...headers]);
  for (const [name, data] of allData) {
    const line = data.find((line) => line[0] === module);
    if (line) {
      const resultLine = [formatResultKeyShort(name)];
      for (const key of headers) {
        const idx = data[0].findIndex((header) => header === key);
        resultLine.push(idx < 0 ? "no results" : line[idx]);
      }
      results.push(resultLine);
    }
  }
  let deduped = transpose(results);
  deduped = dedupeLines(deduped);
  deduped = transpose(deduped);
  deduped = dedupeLines(deduped);
  deduped = transpose(deduped);
  moduleResults[module] = {
    table: formatTable(deduped),
    results,
  };
}

const syntaxResults = {};
for (const header of headers) {
  let results = [];
  results.push([header, ...modules]);
  for (const [name, data] of allDataTransposed) {
    const line = data.find((line) => line[0] === header);
    if (line) {
      const resultLine = [formatResultKeyShort(name)];
      for (const key of modules) {
        const idx = data[0].findIndex((module) => module === key);
        resultLine.push(idx < 0 ? "no results" : line[idx]);
      }
      results.push(resultLine);
    }
  }
  results = transpose(results);
  results = dedupeLines(results);
  results = transpose(results);
  results = dedupeLines(results);
  results = transpose(results);

  syntaxResults[header] = formatTable(results);
}

const diffs = generateAllPairs(Object.keys(runtimeResults));
const excludeHeadersInDiff = new Set(["`import * as x`", "`import()`"]);

const diffResults = {};
for (const diff of diffs) {
  const name = `${diff.map(formatResultKeyLong).join(" vs. ")}`;
  const shortName = `${diff.map(formatResultKeyShort).join(" vs. ")}`;
  let results = [[`fixture<br>${shortName}`, ...diff.map(formatResultKeyShort)]];

  const diffData = diff.map((tool) => allData.find(([t]) => t === tool));
  for (const header of headers) {
    if (excludeHeadersInDiff.has(header)) continue;
    for (const module of modules) {
      const key = `${module}<br>${header}`;
      const line = [key];
      for (const [, data] of diffData) {
        const index = data[0].indexOf(header);
        const dataLine = data.find((line) => line[0] === module);
        line.push(dataLine && index > 0 ? dataLine[index] : "no results");
      }
      results.push(line);
    }
  }

  let deduped = removeIdenticalLines(results);
  deduped = splitCombinedHeader(deduped);
  deduped = dedupeLines(deduped);
  deduped = swapColumns(deduped, 0, 1);
  deduped = dedupeLines(deduped);

  if (deduped.length > 1) {
    diffResults[diffKey(diff)] = {
      name,
      results,
      deduped,
      table: formatTable(deduped)
    };
  }
}

const esmVariants = ["mjs", "js-module", "mts", "ts-module"];
const cjsVariants = ["js", "ts"];
const synthesizingDefaultExport = [["", ...esmVariants, ...cjsVariants, "Grade"]];

for (const runtime in runtimes) {
  if (runtime === "node") continue;
  const { results } = moduleResults["default-export-esModule.js"];
  const line = [runtime];
  let score = 0;
  let hasErrors = false;
  const values = {};
  for (const variant of [...esmVariants, ...cjsVariants]) {
    const key = formatResultKeyShort(`${runtime}.${variant}`);
    const testCase = "`import x`";
    const columnIndex = results[0].indexOf(testCase);
    const rowIndex = results.findIndex((line) => line[0] === key);
    if (rowIndex < 0) {
      line.push("no results");
      continue;
    }
    const value = results[rowIndex][columnIndex];
    values[variant] = value;
    const synthesizedDefaultExport = value.startsWith("`{") && value.includes("default") ? true : value === "`'default'`" ? false : undefined;
    if (synthesizedDefaultExport === undefined) {
      line.push("❓");
      hasErrors = true;
      continue;
    }
    const isESM = esmVariants.includes(variant);
    const isExpected = synthesizedDefaultExport === isESM;
    if (isExpected) {
      score++;
    }
    const symbol = isESM
      ? isExpected ? "✅" : "❌"
      : isExpected ? "👍" : "👎";
    line.push(symbol + (synthesizedDefaultExport ? " Synthesized" : " Not synthesized"));
  }

  const isTSConsistentWithJS = !hasErrors && values.mjs === values.mts && values.js === values.ts && values["js-module"] === values["ts-module"];
  line.push((isTSConsistentWithJS ? "💙" : "") + (score === 6 ? " 🌟" : ""));
  synthesizingDefaultExport.push(line);
}

const readmeContents = `# ESM-CJS Interop Test

[View on GitHub](https://github.com/andrewbranch/interop-test)

This project is forked from [sokra/interop-test](https://github.com/sokra/interop-test) with the following changes:

- Many test cases / exporting modules removed
- TypeScript file extensions tested
- package.json \`"type": "module"\` tested
- Every test case is tested against every importing file variant
- Every runtime result is diffed against every other
- Added meta-analysis to answer high-level questions
- Added Bun, Parcel, Vite

## Table of Contents

- [Meta-analysis](#meta-analysis)
  - [Synthesizing default exports for CJS modules](#synthesizing-default-exports-for-cjs-modules)
- [Results by runtime](#results-by-runtime)
${Object.keys(runtimes)
  .map(runtime => `  - ${runtime} ${runtimeVersions[runtime]}\n${Object.keys(variants).filter(variant => runtimeResults[`${runtime}.${variant}`])
    .map(variant => `    - [${formatVariant(variant)}](#${hash(formatResultKeyLong(`${runtime}.${variant}`))})`).join("\n")}`
  ).join("\n")
}
- [Results by exporting module](#results-by-exporting-module)
${Object.keys(moduleResults).map(name => `  - [${name}](#${hash(name)})`).join("\n")}
- [Results by import test case](#results-by-import-test-case)
${Object.keys(syntaxResults).map(name => `  - [${name}](#${hash(name)})`).join("\n")}
- [Differences](#differences)

## Meta-analysis

### Synthesizing default exports for CJS modules

In Node, a default import of a CommonJS module always links to the \`module.exports\` object. In other words,
a CJS module imported from ESM looks like \`[Module: null prototype] { default: (module.exports) }\`. This is
sometimes called “synthesizing” a default export. Traditionally, bundlers and ESM-to-CJS transpilers have instead
linked default imports to the \`module.exports.default\` property when there is also an \`exports.__esModule\`
property (indicating that the module was transpiled from ESM). In other words, they selectively disable default
export synthesis, whereas Node always enables it. This creates an inconsistency between how some imports behave
in Node and how they behave in bundlers. Consequently, esbuild and Webpack adopt Node’s behavior and always
synthesize default exports in files that Node would recognize as ESM—that is, files with an \`.mjs\` extension
or \`"type": "module"\` in \`package.json\`. (So... they selectively disable their selective disabling of default
export synthesis?)

This practice is Probably A Good Idea, but if it’s applied based on file extensions, it _must_ be done for the
equivalent TypeScript file extensions as well in order for TypeScript to reason about the behavior. My priorities
are ordered as follows:

1. Consistency between JS and TS variants
2. Consistency between all bundlers (lol)
3. Default export synthesis for CJS modules imported from \`.mjs\`, \`.mts\`, and \`"type": "module"\`-scoped \`.js\`
   and \`.ts\` files for compatibility with Node
4. No default export synthesis for CJS modules with \`__esModule\` when imported from files that are _not_ \`.mjs\`,
    \`.mts\`, or \`"type": "module"\`-scoped \`.js\` and \`.ts\` files

The following table summarizes data that can be found in the [default-export-esModule.js](#default-export-esmodulejs)
table, and grades each bundler’s behavior against these priorities.

| Legend |  |
|--------|---------|
| ✅ / ❌ | Satisfies / violates priority (3): Default synthesis in Node ESM files |
| 👍 / 👎 | Satisfies / violates priority (4): \`__esModule\` disables synthesis in non-Node-ESM files |
| ❓     | An error or totally unexpected behavior prohibits analysis |
| 💙     | Satisfies priority (1): TS consistency |
| 🌟     | Perfect score |

${formatTable(synthesizingDefaultExport)}

## Results by runtime

${Object.entries(runtimeResults).map(([name, { table, versions }]) => {
  return `### ${formatResultKeyLong(name)}\n\nVersions:\n${ul(Object.entries(versions).map(t => t.join("@")))}\n\n${table}`;
}).join("\n\n")}

## Results by exporting module

${Object.entries(moduleResults).map(([name, { table }]) => {
  const content = fs.readFileSync(path.resolve(__dirname, "../modules", name), "utf-8");
  const codeBlock = `\`\`\`js\n` +
    content.split("\n").map(line => `${line}`).join("\n") +
    `\n\`\`\``;
  return `### ${name}\n\n${codeBlock}\n\n${table}`;
}).join("\n\n")}

## Results by import test case

${Object.entries(syntaxResults).map(([name, table]) => {
  return `### ${name}\n\n${table}`;
}).join("\n\n")}

## Differences

${diffTable()}

${Object.entries(diffResults).map(([, { name, table }]) => {
  return `### ${name}\n\n${table}`;
}).join("\n\n")}

`;

fs.writeFileSync(path.resolve(__dirname, "../README.md"), readmeContents);

function formatResultKeyLong(name) {
  const [runtime, variant] = name.split(".");
  return `${runtime} (${formatVariant(variant)})`;
}

function formatResultKeyShort(name) {
  const [runtime, variant] = name.split(".");
  return `${runtime} (${variant})`;
}

function formatVariant(variant) {
  const [extension, module] = variant.split("-");
  return `\`.${extension}\`${module ? ` with \`"type": "module"\`` : ""}`;
}

function hash(str) {
  return str.toLowerCase()
    .replace(/( \* )|( === )/g, "-")
    .replace(/[^a-z0-9- ]/g, "")
    .replace(/\s+/g, "-");
}

function generateAllPairs(arr) {
  return arr.reduce((acc, v, i) => 
    acc.concat(arr.slice(i+1).map(w => [v, w])), []);
}

function diffKey(pair) {
  return pair.sort().join("-");
}

function diffTable() {
  const headers = Object.keys(runtimeResults);
  const table = [["", ...headers.map(key => strong(formatResultKeyShort(key)))]];
  for (const columnHeader of headers) {
    const line = [strong(formatResultKeyShort(columnHeader))];
    for (const rowHeader of headers) {
      if (rowHeader === columnHeader) {
        line.push("-");
      }
      else {
        const diff = diffResults[diffKey([columnHeader, rowHeader])];
        const symbol = diff?.deduped.length > 15 ? "💥" : diff?.deduped.length > 10 ? "❗️" : diff?.deduped.length > 5 ? "⚠️" : "🤏";
        line.push(!diff ? "✅ identical" : `[${symbol} ${diff.deduped.length - 1}](#${hash(diff.name)})`);
      }
    }
    table.push(line);
  }
  return formatTable(table);
}

function strong(str) {
  return `**${str}**`;
}

function ul(arr) {
  return arr.map(item => `- ${item}`).join("\n");
}
