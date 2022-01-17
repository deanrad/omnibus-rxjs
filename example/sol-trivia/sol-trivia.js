'use strict';
const React = require('react');
const { Text, Box, useInput, useApp, useStdout } = require('ink');
const InkText = require('ink-text-input');
const { useEffect, useState } = require('react');
const UncontrolledTextInput = InkText.UncontrolledTextInput;

const { bus } = require('./bus');

const App = () => {
	const [active, setActive] = React.useState('A1');
	const { exit } = useApp();
	const { stdout } = useStdout();

	useInput((input, key) => {
		if (input === 'q') {
			process.exit(0);
		}
	});

	return (
		<>
			<Text>
				Welcome to Sol-Trivia!. Press 'b' to begin the game. 'q' to exit.
			</Text>
		</>
	);
};

function runDemo() {
	console.log('TODO run the demo');
}
// Uncomment to verify it's working
process.env.DEMO && runDemo();

module.exports = App;
