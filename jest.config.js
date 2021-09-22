module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['dist/tsc'],
  verbose: true,
  silent: false,
  coveragePathIgnorePatterns: ['example', 'test'],
  // the stats report specify their own test sequencer, but test:fast needn't
  // testSequencer: './test/util/byPathSequencer.js',
};
