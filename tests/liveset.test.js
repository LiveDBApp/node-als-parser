import { LiveSet } from '../index.js'

const TEST_PROJECT_FILE = './tests/test-data/projects/Michelle.als'

test('we get the expected metadata back', async () => {
	let set = await new LiveSet(TEST_PROJECT_FILE)

	expect(set.info.name).toBe('Michelle.als')
	expect(set.info.trackCount).toBe(9)
	expect(set.info.version.app).toBe('Ableton Live')
	expect(set.info.version.major).toBe(11)
	expect(set.info.version.minor).toBe(3)
	expect(set.info.version.patch).toBe(21)
	expect(set.info.sha256).toBe(
		'a79d07d37eba73a8ec631a8ad14d5ab0b6a8bbf0bebb98d934e0eb93f98b67c7',
	)
})

test('getting tempo from different set files', async () => {
	let foo = await new LiveSet('./tests/test-data/projects/Foo Project/Foo.als')

	// console.log('XXX info', foo.info)

	// expect(foo.tempo).toBe('NaN')

	expect(foo.tempo).toBe('199.99')
	let bar = await new LiveSet('./tests/test-data/projects/Bar Project/Bar.als')
	// expect(bar.tempo).toBe('104.50')
})

test('loading a Live 12.3 als file', async () => {
	let set = await new LiveSet('./tests/test-data/projects/Michelle-12.3.als')

	expect(set.info.name).toBe('Michelle-12.3.als')
	expect(set.info.trackCount).toBe(9)
	expect(set.info.version.app).toBe('Ableton Live')
	expect(set.info.version.major).toBe(12)
	expect(set.info.version.minor).toBe(3)
	expect(set.info.version.patch).toBe(2)
	expect(set.info.sha256).toBe(
		'365ca6ed7b4bb2e787e4be0923fbe55d1acf70a5829bfdb5d29c36104b36b0c7',
	)
})

test('version parsing supports different Creator formats', () => {
	const testCases = [
		{
			creator: 'Ableton Live 12.3.2',
			expected: { app: 'Ableton Live', major: 12, minor: 3, patch: 2 },
		},
		{
			creator: 'Ableton Live 11.3.21',
			expected: { app: 'Ableton Live', major: 11, minor: 3, patch: 21 },
		},
		{
			creator: 'Ableton Live 10.1',
			expected: { app: 'Ableton Live', major: 10, minor: 1, patch: 0 },
		},
		{
			creator: 'Ableton Live 9.7',
			expected: { app: 'Ableton Live', major: 9, minor: 7, patch: 0 },
		},
	]

	testCases.forEach(({ creator, expected }) => {
		const regex = /([a-zA-Z\ ]+)\ ([0-9]+)\.([\d]+)(?:\.([\d]+))?/
		const pieces = regex.exec(creator)

		const result = {
			app: pieces[1],
			major: parseInt(pieces[2]),
			minor: parseInt(pieces[3]),
			patch: parseInt(pieces[4]) || 0,
		}

		expect(result).toEqual(expected)
	})
})
