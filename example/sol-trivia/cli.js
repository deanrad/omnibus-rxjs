#!/usr/bin/env node
'use strict';
const React = require('react');
const importJsx = require('import-jsx');
const { render } = require('ink');
const meow = require('meow');

const ui = importJsx('./sol-trivia');

const cli = meow(
	`
	Usage
	  $ sol-trivia

	Options
		--name  Your name

	Examples
	  $  sol-trivia --name=Logan
	  Hello, Logan
`,
	{
		flags: {
			name: {
				type: 'string',
				alias: 'n',
			},
		},
	}
);

const clear = require('clear');
clear();

render(React.createElement(ui, cli.flags));
