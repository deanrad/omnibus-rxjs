'use strict';
const React = require('react');
const { Text, Box, useInput, useApp, useStdout } = require('ink');
const InkText = require('ink-text-input');
const { bus } = require('./bus');

const useWhileMounted = (subsFactory) => {
	React.useEffect(() => {
		const subs = subsFactory();
		return () => subs.unsubscribe();
	}, []);
};

const GUESS_WORD = 'ALEPH';

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
						value={filledIn[label] || ''}
						isActive={label === activeLetter}
					/>
				);
			})}
		</Box>
	);
};

const Old = ({ rows = [] }) => {
	return rows.map((letters, rowIdx) => {
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
				{letters.split('').map((l, idx) => (
					<Text
						key={`l${idx}`}
						bold={GUESS_WORD[idx] === l || GUESS_WORD.includes(l)}
						color={
							GUESS_WORD[idx] === l
								? 'greenBright'
								: GUESS_WORD.includes(l)
								? 'yellow'
								: 'grey'
						}
					>
						{l}
					</Text>
				))}
			</Box>
		);
	});
};

const App = () => {
	const [active, setActive] = React.useState('0');
	const [oldRows, setOldRows] = React.useState([]);
	const [filledIn, setFilledIn] = React.useState({});
	const [logs, setLogs] = React.useState([]);
	const [won, setWon] = React.useState(false);

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
		// not working
		// if (key.backspace || key.leftArrow) {
		// 	setActive((c) => Number(c) - 1 + '');
		// }
		// if (key.rightArrow) {
		// 	setActive((c) => Number(c) + 1 + '');
		// }
		setActive((c) => Number(c) + 1 + '');
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
