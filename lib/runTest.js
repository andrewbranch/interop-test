const [runtime, variant] = process.argv.slice(2);

const variants = {
  'mjs': { ext: '.mjs', packageJsonType: undefined, isTypeScript: false },
  'js': { ext: '.js', packageJsonType: undefined, isTypeScript: false },
  'js-module': { ext: '.js', packageJsonType: 'module', isTypeScript: false },
  'mts': { ext: '.mts', packageJsonType: undefined, isTypeScript: true },
  'ts': { ext: '.ts', packageJsonType: undefined, isTypeScript: true },
  'ts-module': { ext: '.ts', packageJsonType: 'module', isTypeScript: true },
};

const runtimes = {
  'node': { helper: './runners/runNodeTest', ignoreTypeScript: true },
  'bun': { helper: './runners/runBunTest', ignoreTypeScript: false },
  'babel': { helper: './runners/runBabelTest', ignoreTypeScript: false },
  'webpack': { helper: './runners/runWebpackTest', ignoreTypeScript: false },
  'rollup': { helper: './runners/runRollupTest', ignoreTypeScript: false },
  'esbuild': { helper: './runners/runEsbuildTest', ignoreTypeScript: false },
  'parcel': { helper: './runners/runParcelTest', ignoreTypeScript: false },
};

if (!runtimes[runtime]) {
  throw new Error(`First argument must be one of ${Object.keys(runtimes).join(', ')}`);
}
if (!variants[variant]) {
  throw new Error(`Second argument must be one of ${Object.keys(variants).join(', ')}`);
}
if (variants[variant].isTypeScript && runtimes[runtime].ignoreTypeScript) {
  throw new Error(`TypeScript is not supported by ${runtime}`);
}

const runTest = require(runtimes[runtime].helper);
runTest(runtime, variant, variants[variant].ext, variants[variant].packageJsonType);
