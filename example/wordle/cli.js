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
		--name  Your name

	Examples
	  $ 7guis-cells --name=Jane
	  Hello, Jane
`);

const clear = require('clear');
clear();

render(React.createElement(ui, cli.flags));
