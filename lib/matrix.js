exports.variants = {
  'mjs': { ext: '.mjs', packageJsonType: undefined, isTypeScript: false },
  'js': { ext: '.js', packageJsonType: undefined, isTypeScript: false },
  'js-module': { ext: '.js', packageJsonType: 'module', isTypeScript: false },
  'mts': { ext: '.mts', packageJsonType: undefined, isTypeScript: true },
  'ts': { ext: '.ts', packageJsonType: undefined, isTypeScript: true },
  'ts-module': { ext: '.ts', packageJsonType: 'module', isTypeScript: true },
};

exports.runtimes = {
  'node': { helper: './runners/runNodeTest', ignoreTypeScript: true },
  'bun': { helper: './runners/runBunTest', ignoreTypeScript: false },
  'babel': { helper: './runners/runBabelTest', ignoreTypeScript: false, versionPackage: '@babel/core' },
  'webpack': { helper: './runners/runWebpackTest', ignoreTypeScript: false },
  'rollup': { helper: './runners/runRollupTest', ignoreTypeScript: false },
  'esbuild': { helper: './runners/runEsbuildTest', ignoreTypeScript: false },
  'parcel': { helper: './runners/runParcelTest', ignoreTypeScript: false, versionPackage: '@parcel/core' },
  'vite': { helper: './runners/runViteTest', ignoreTypeScript: false },
};
