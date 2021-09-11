const React = require('react');
const { render, Box, Text } = require('ink');
const TI = require('ink-text-input');
// console.log(Object.keys(TextInput));
const TextInput = TI.default;

const SearchQuery = () => {
	const [query, setQuery] = React.useState('');

	return (
		<Box>
			<Box marginRight={1}>
				<Text>Enter your query:</Text>
			</Box>

			<TextInput value={query} onChange={setQuery} />
		</Box>
	);
};

module.exports = SearchQuery;
