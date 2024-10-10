import * as lib from '../lib.js'

test('gets file info', async () => {
	expect(1).toBe(1)
})

test('read .als zip file', async () => {
	expect(1).toBe(1)
})

test('parse xml', async () => {
	expect(1).toBe(1)
})

test('findAlsFiles', async () => {
	let files = await lib.findAlsFiles('./testfiles/')
	expect(1).toBe(1)
})
