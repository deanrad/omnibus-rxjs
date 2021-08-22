// var ast = esprima.parse(sourceNode.value);
// selectorAst = esquery.parse('*');
// matches = esquery.match(ast, selectorAst);
// nodeCount = matches.length;

// write to stdout
const mockOut = {
  js: {
    astNodeCount: {
      bus: 66,
    },
  },
};

process.stdout.write(JSON.stringify(mockOut, null, 2) + '\n', 'utf-8');
