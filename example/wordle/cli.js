#!/usr/bin/env node
'use strict';
const React = require('react');
const importJsx = require('import-jsx');
const { render } = require('ink');
const meow = require('meow');

const ui = importJsx('./wordle');

const cli = meow(`
	Usage
	  $ wordle

	Options
		--random  Choose a random word (if not, the word is ALEPH)

	Examples
	  $ node examples/wordle/cli.js --name=Jane
`);

const clear = require('clear');
clear();

render(React.createElement(ui, cli.flags));
