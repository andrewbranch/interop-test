const { runtimes, variants } = require('./matrix');
const [runtime, variant] = process.argv.slice(2);

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
