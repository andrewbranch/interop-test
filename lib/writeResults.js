const { dedupeLines, transpose, formatTable, markOutlinersInLine, removeIdenticalLines, splitCombinedHeader, swapColumns } = require("./helpers/tableUtils");

const fs = require("fs");
const path = require("path");
const { variants } = require("./matrix");

const resultsFiles = fs.readdirSync(path.resolve(__dirname, "../results"))
  .sort((a, b) => {
  const [aRuntime, aVariant] = a.split(".");
  const [bRuntime, bVariant] = b.split(".");
  if (aRuntime === bRuntime) {
    return variants.indexOf(aVariant) - variants.indexOf(bVariant);
  }
  return aRuntime.localeCompare(bRuntime);
});

const moduleFiles = fs.readdirSync(path.resolve(__dirname, "../modules"));

const headers = new Set();
let modules = new Set();
const allData = [];
/** @type {[string, any][]} */
const allDataTransposed = [];

const runtimeResults = {};
const runtimes = new Set();
for (const file of resultsFiles) {
  const [runtime, variant] = file.split(".");
  const name = `${runtime}.${variant}`;
  let data = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../results", file), "utf-8")
  );

  for (const header of data[0].slice(1)) {
    headers.add(header);
  }
  for (const [module] of data.slice(1)) {
    modules.add(module);
  }
  allData.push([name, data]);
  allDataTransposed.push([name, transpose(data)]);

  data = dedupeLines(data);
  data = transpose(data);
  data = dedupeLines(data);
  data = transpose(data);
  data[0][0] = formatResultKeyShort(name);
  const table = formatTable(data);
  runtimeResults[name] = table;
  runtimes.add(runtime);
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
  results = transpose(results);
  markOutlinersInLine(results);
  results = dedupeLines(results);
  results = transpose(results);
  results = dedupeLines(results);
  results = transpose(results);
  moduleResults[module] = formatTable(results);
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
  markOutlinersInLine(results);
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

  results = removeIdenticalLines(results);
  results = splitCombinedHeader(results);
  results = dedupeLines(results);
  results = swapColumns(results, 0, 1);
  results = dedupeLines(results);

  if (results.length > 1) {
    diffResults[diffKey(diff)] = {
      name,
      results,
      table: formatTable(results)
    };
  }
}

const readmeContents = `# ESM-CJS Interop Test

This project is forked from [sokra/interop-test](https://github.com/sokra/interop-test) with the following changes:

- Many test cases / exporting modules removed
- TypeScript file extensions tested
- package.json \`"type": "module"\` tested
- Every test case is tested against every importing file variant
- Every runtime result is diffed against every other

## Table of Contents

- [List of exporting modules](#exporting-modules)
- [Results by runtime](#results-by-runtime)
${Array.from(runtimes)
  .map(runtime => `  - ${runtime}\n${variants.filter(variant => runtimeResults[`${runtime}.${variant}`])
    .map(variant => `    - [${formatVariant(variant)}](#${hash(formatResultKeyLong(`${runtime}.${variant}`))})`).join("\n")}`
  ).join("\n")
}
- [Results by exporting module](#results-by-exporting-module)
${Object.keys(moduleResults).map(name => `  - [${name}](#${hash(name)})`).join("\n")}
- [Results by import test case](#results-by-import-test-case)
${Object.keys(syntaxResults).map(name => `  - [${name}](#${hash(name)})`).join("\n")}
- [Differences](#differences)

${diffTable()}

## Exporting modules

${moduleFiles.map(module => {
  const content = fs.readFileSync(path.resolve(__dirname, "../modules", module), "utf-8");
  return `- \`${module}\`:\n` +
    `   \`\`\`js\n` +
    content.split("\n").map(line => `   ${line}`).join("\n") +
    `\n   \`\`\``;
}).join("\n")}

## Results by runtime

${Object.entries(runtimeResults).map(([name, table]) => {
  return `### ${formatResultKeyLong(name)}\n\n${table}`;
}).join("\n\n")}

## Results by exporting module

${Object.entries(moduleResults).map(([name, table]) => {
  return `### ${name}\n\n${table}`;
}).join("\n\n")}

## Results by import test case

${Object.entries(syntaxResults).map(([name, table]) => {
  return `### ${name}\n\n${table}`;
}).join("\n\n")}

## Differences

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
  let i = 1;
  for (const columnHeader of headers) {
    const line = [strong(formatResultKeyShort(columnHeader))];
    for (const rowHeader of headers) {
      if (rowHeader === columnHeader) {
        line.push("-");
      }
      else if (headers.indexOf(rowHeader) >= i) {
        const diff = diffResults[diffKey([columnHeader, rowHeader])];
        const symbol = diff?.results.length > 15 ? "💥" : diff?.results.length > 10 ? "❗️" : diff?.results.length > 5 ? "⚠️" : "🤏";
        line.push(!diff ? "✅ identical" : `[${symbol} ${diff.results.length - 1}](#${hash(diff.name)})`);
      } else {
        line.push("");
      }
    }
    table.push(line);
    i++;
  }
  return formatTable(table);
}

function strong(str) {
  return `**${str}**`;
}
