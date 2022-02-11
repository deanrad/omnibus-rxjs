'use strict';
const React = require('react');
const { Text, Box, useInput, useApp, useStdout } = require('ink');
const InkText = require('ink-text-input');

const { bus } = require('./bus');
const { randomWord } = require('./word-list');

const useWhileMounted = (subsFactory) => {
	React.useEffect(() => {
		const subs = subsFactory();
		return () => subs.unsubscribe();
	}, []);
};

const InputCell = ({ label, value, isActive }) => {
	return (
		<Box borderStyle="single" color={isActive ? 'green' : 'white'}>
			<InkText.default
				key={label}
				focus={isActive}
				placeholder={''}
				value={value}
				onChange={(value) => {
					bus.trigger({ type: 'cell/content/set', payload: [label, value] });
				}}
			/>
		</Box>
	);
};

const InputRow = ({ filledIn, activeLetter = 1 } /* words, guesses */) => {
	return (
		<Box
			height={5}
			width={72}
			color="green"
			borderStyle="single"
			borderColor="white"
			flexGrow="1"
			justifyContent="space-around"
		>
			{['0', '1', '2', '3', '4'].map((label) => {
				return (
					<InputCell
						key={label}
						label={label}
						width={2}
						value={filledIn[label] || ''}
						isActive={label === activeLetter}
					/>
				);
			})}
		</Box>
	);
};

const Old = ({ rows = [] }) => {
	return rows.map((guess, rowIdx) => {
		let guessLetters = guess.split('');
		let stillLive = GUESS_WORD.split('');
		let colors = [];

		// color & remove exact matches
		guessLetters.forEach((l, idx) => {
			if (GUESS_WORD[idx] === l) {
				colors[idx] = 'greenBright';
				delete stillLive[stillLive.indexOf(l)];
			}
		});

		// now color near misses
		stillLive.forEach((l) => {
			if (guessLetters.includes(l)) {
				const idx = guessLetters.indexOf(l);
				colors[idx] = 'yellow';
				delete stillLive[stillLive.indexOf(l)];
			}
		});

		return (
			<Box
				height={5}
				width={72}
				key={`row-${rowIdx}`}
				color="green"
				borderStyle="single"
				borderColor="white"
				flexGrow="1"
				justifyContent="space-around"
			>
				{guessLetters.map((l, idx) => {
					return (
						<Text key={`l${idx}`} bold={true} color={colors[idx] || 'gray'}>
							{l}
						</Text>
					);
				})}
			</Box>
		);
	});
};

let GUESS_WORD;
const App = ({ random, word }) => {
	const [active, setActive] = React.useState('0');
	const [oldRows, setOldRows] = React.useState([]);
	const [filledIn, setFilledIn] = React.useState({});
	const [logs, setLogs] = React.useState([]);
	const [won, setWon] = React.useState(false);
	const [thinking, setThinking] = React.useState(false);

	React.useEffect(() => {
		GUESS_WORD = random
			? randomWord().toUpperCase()
			: word.toUpperCase() ?? 'ALEPH';
	}, []);

	// hook up to console
	useApp();
	useStdout();

	useWhileMounted(() => {
		bus.listen(
			({ type }) => type === 'cell/content/set',
			(e) => {
				// DevTools ala cheap
				// setLogs((old) => [...old, JSON.stringify(e)]);
				const [label, value] = e.payload;

				setFilledIn((old) => {
					return { ...old, [label]: value };
				});
				if (label === '4') {
					return Promise.resolve().then(() => {
						setActive('0');
					});
				}
			}
		);
	});

	React.useEffect(() => {
		const currentGuess = Object.values(filledIn).join('').toUpperCase();
		if (currentGuess === GUESS_WORD) {
			setWon(true);
		}

		if (filledIn[4] !== '') {
			setOldRows((old) => [
				...old,
				Object.values(filledIn)
					.map((l) => l.toUpperCase())
					.join(''),
			]);
			setFilledIn({ 0: '', 1: '', 2: '', 3: '', 4: '' });
		}
	}, [filledIn]);

	useInput((input, key) => {
		if (input === '1') {
			process.exit(0);
		}
		// not working - cant go backwards
		// if (key.backspace || key.leftArrow) {
		// 	setActive((c) => Number(c) - 1 + '');
		// }
		// if (key.rightArrow) {
		// 	setActive((c) => Number(c) + 1 + '');
		// } else {
		// 	setActive((c) => Number(c) + 1 + '');
		// }
		// if (!key.leftArrow) {
		const direction = key.leftArrow || key.backspace || key.delete ? -1 : 1;
		setActive((c) => {
			const newNumber = Number(c) + direction;
			if (direction === -1) {
				setFilledIn((old) => ({ ...old, [newNumber]: '' }));
			}
			return newNumber + '';
		});
		// }
	});

	function historyHas(letter) {
		const ul = letter.toUpperCase();
		const wasGuessed = oldRows.some((row) => row.indexOf(ul) > -1);
		if (!wasGuessed) return 'white';

		const wasInWord = oldRows.some((letters) =>
			Array.from(letters).some(() => Array.from(GUESS_WORD).includes(ul))
		);
		const wasInPlace = oldRows.find((letters) =>
			Array.from(GUESS_WORD).find((gl, idx) => letters[idx] === gl && gl === ul)
		);

		if (!wasInWord) return 'blackBright';

		return wasInPlace ? 'green' : 'yellow';
	}

	return (
		<>
			<Text>Welcome to Wordle! Press '1' to exit.</Text>
			<Old rows={oldRows} />
			{!won ? (
				<>
					<InputRow filledIn={Object.values(filledIn)} activeLetter={active} />

					<Box flexDirection="row">
						<Text>{'                     '}</Text>
						{'ABCDEFGHIJKLM'.split('').map((l) => {
							return (
								<Text bold={true} key={`letter-${l}`} color={historyHas(l)}>
									{' ' + l}
								</Text>
							);
						})}
					</Box>
					<Box flexDirection="row">
						<Text>{'                     '}</Text>
						{'NOPQRSTUVWXYZ'.split('').map((l) => {
							return (
								<Text bold={true} key={`letter-${l}`} color={historyHas(l)}>
									{' ' + l}
								</Text>
							);
						})}
					</Box>
					<Box flexDirection="column">
						{logs.map((log, idx) => (
							<Text key={`log-${idx}`}>{log}</Text>
						))}
					</Box>
				</>
			) : (
				<Text>You Got It In {oldRows.length - 1} tries!</Text>
			)}
		</>
	);
};

module.exports = App;
