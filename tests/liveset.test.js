import { LiveSet } from '../index.js'

const TEST_PROJECT_FILE = './testfiles/Michelle.als'

test('we get the expected metadata back', async () => {
	let set = await new LiveSet(TEST_PROJECT_FILE)

	console.log(set.info)

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
	let foo = await new LiveSet('./testfiles/Foo Project/Foo.als')
	expect(foo.tempo).toBe('199.99')
	let bar = await new LiveSet('./testfiles/Bar Project/Bar.als')
	expect(bar.tempo).toBe('104.50')
})
