'use strict';
const React = require('react');
const { Text, Box, useFocus, useFocusManager, useInput } = require('ink');
const InkText = require('ink-text-input');
const TextInput = InkText.default;
const { Omnibus } = require('omnibus-rxjs');
const UncontrolledTextInput = InkText.UncontrolledTextInput;

const bus = new Omnibus();
bus.spy((e) => console.log(e));
bus.listen(
	({ type, content: [field, value] }) => type === 'cell/content/set',
	() => {
		console.log(field, value);
	}
);
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
