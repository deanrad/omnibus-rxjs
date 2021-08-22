const esprima = require('esprima');
const esquery = require('esquery');

// for each interesting file
const dir = 'dist/tsc/src';
const files = ['bus'];
const astNodeCount = {};
files.forEach((f) => {
  // LEFTOFF!
});
// var ast = esprima.parse(str);
// selectorAst = esquery.parse('*');
// matches = esquery.match(ast, selectorAst);
// nodeCount = matches.length;

// write to stdout
const mockOut = {
  js: {
    astNodeCount: {
      'bus.js': 66,
    },
  },
};

process.stdout.write(JSON.stringify(mockOut, null, 2) + '\n', 'utf-8');
