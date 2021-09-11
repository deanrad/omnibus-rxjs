'use strict';
const React = require('react');
const {
	Text,
	Box,
	useFocus,
	useFocusManager,
	useInput,
	useApp,
} = require('ink');
const InkText = require('ink-text-input');
const TextInput = InkText.default;
const { Omnibus } = require('omnibus-rxjs');
const { useEffect } = require('react');
const UncontrolledTextInput = InkText.UncontrolledTextInput;
const { bufferTime } = require('rxjs/operators');
const { tap } = require('rxjs');
const bus = new Omnibus();
// bus.spy((e) => console.log(e));
const contents = {};
const deps = {};
const values = {};

const evaluateFormula = (formula) => {
	// console.log({ formula });
	const depCells = formula.substr(1).split('+');
	const newValue = depCells.reduce(
		(total, one) =>
			total +
			(Number.parseInt(one, 10) ? Number(one) : Number(values[one] || 0)),
		0
	);
	return [newValue, depCells];
};

bus.errors.subscribe((e) => console.error(e));
bus.spy(({ type, content }) => console.log(type, content));
bus.listen(
	({ type }) => type === 'cell/content/set',
	({ content: [field, value] }) => {
		contents[field] = value;
		let newValue;
		if (value.startsWith('=')) {
			const [val, depCells] = evaluateFormula(value);
			newValue = val;
			deps[field] = depCells;
		} else {
			newValue = Number(value);
		}
		values[field] = newValue;
		bus.trigger({ type: 'cell/value/set', value: [field, newValue] });
	}
);

bus.listen(
	({ type }) => type === 'cell/value/set',
	({ value }) => {
		const [field] = value;
		// console.log(JSON.stringify(values));

		for (let [key, depArray] of Object.entries(deps)) {
			if (depArray.includes(field)) {
				const [newValue] = evaluateFormula(contents[key]);
				values[key] = newValue;
				bus.trigger({ type: 'cell/value/set', value: [key, newValue] });
			}
		}
	}
);

// runaway detection if we exceed 10 in 5 msec
const runawayDetect = (exit) => () => {
	bus
		.query(({ type }) => type === 'cell/value/set')
		.pipe(bufferTime(5))
		.subscribe((buffer) => {
			if (buffer.length > 10) {
				console.log('Cyclical formula detected');
				exit();
				process.exit(1);
			}
		});
};

const Cell = ({ label, isActive }) => {
	return (
		<Box borderStyle="single" color={isActive ? 'green' : 'white'}>
			<UncontrolledTextInput
				key={label}
				focus={isActive}
				placeholder={isActive ? 'Formula' : ''}
				onSubmit={(value) =>
					bus.trigger({ type: 'cell/content/set', content: [label, value] })
				}
			/>
		</Box>
	);
};
const App = () => {
	const [active, setActive] = React.useState('A1');
	const { exit } = useApp();
	useEffect(runawayDetect(exit), []);
	useInput((_, key) => {
		if (key.rightArrow || key.return) {
			setActive((old) => (old === 'A1' ? 'B1' : old === 'B1' ? 'C1' : 'A1'));
		}
		if (key.leftArrow) {
			setActive((old) => (old === 'A1' ? 'C1' : old === 'B1' ? 'A1' : 'B1'));
		}
	});

	return (
		<>
			<Text>Enter to Save. Arrows to move.</Text>
			<Text>
				Formula may contain A1,B1,C1, or number, with + (example: =A1+5)
			</Text>
			<Box
				height={4}
				width={72}
				color="green"
				borderStyle="single"
				borderColor="white"
				flexGrow="1"
				justifyContent="space-around"
			>
				<Text>|</Text>
				<Text>A</Text>
				<Text>B</Text>
				<Text>C</Text>
			</Box>
			<Box
				height={5}
				width={72}
				color="green"
				borderStyle="single"
				borderColor="white"
				flexGrow="1"
				justifyContent="space-around"
			>
				<Text>|</Text>
				{['A1', 'B1', 'C1'].map((label) => {
					return <Cell key={label} label={label} isActive={label === active} />;
				})}
			</Box>
		</>
	);
};

module.exports = App;
