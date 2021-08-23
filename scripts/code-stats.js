const esprima = require('esprima');
const esquery = require('esquery');
const tsquery = require('@phenomnomnominal/tsquery').tsquery;

const fs = require('fs');
// for each interesting file
const files = [
  'dist/tsc/src/bus.js',
  'src/bus.ts',
  'dist/tsc/src/utils.js',
  'src/utils.ts',
];

const astNodeCount = {};
files.forEach((f) => {
  const nodeCount = getNodeCount(f);
  astNodeCount[f] = nodeCount;
});

function getNodeCount(f) {
  const count = f.endsWith('.js') ? getJSNodeCount(f) : getTSNodeCount(f);
  return count;
}

function getJSNodeCount(filename) {
  const contents = fs.readFileSync(filename, 'utf-8');
  const selector = esquery.parse('*');
  const ast = esprima.parse(contents, { sourceType: 'module' });
  const matches = esquery.match(ast, selector);
  return matches.length;
}

function getTSNodeCount(filename) {
  const contents = fs.readFileSync(filename, 'utf-8');
  const ast = tsquery.ast(contents);
  const nodes = tsquery(ast, '*');
  return nodes.length;
}

const nodeCounts = { astNodeCount };

process.stdout.write(JSON.stringify(nodeCounts, null, 2) + '\n', 'utf-8');
