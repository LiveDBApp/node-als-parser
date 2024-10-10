import * as lib from '../lib.js'
import _ from 'lodash-es'

const TEST_FILE_PATH = './testfiles/Michelle.als'
const TEST_PROJECT_FOLDER = './testfiles/Test Project'

test('gets file info', async () => {
	let results = await lib.getFileInfo(TEST_FILE_PATH)
	// console.log(results)
	expect(results.name).toBe('Michelle.als')
})

test('read .als zip file', async () => {
	let results = await lib.readZipContents(TEST_FILE_PATH)
	expect(results.indexOf('<?xml version="1.0" encoding="UTF-8"?>')).toBe(0)
})

test('parse xml', async () => {
	let raw = await lib.readZipContents(TEST_FILE_PATH)
	let results = await lib.parseXmlString(raw)

	let keys = _.keys(results)
	expect(keys[0]).toBe('$')
	expect(keys[1]).toBe('LiveSet')
})

test('findAlsFiles', async () => {
	let files = await lib.findAlsFiles('./testfiles/')
	expect(files[0].split('/').pop()).toBe('Michelle.als')
})

// test('validating a project folder', async () => {
// 	let results = await lib.validateAbletonProject(TEST_PROJECT_FOLDER)
// 	console.log(results)
// 	expect(results.isValid).toBe(true)
// })

test('failing a non-existent folder', async () => {
	let results = await lib.validateAbletonProject('./foobarbaz')
	expect(results.isValid).toBe(false)
	expect(results.errors[0]).toBe('Path does not exist')
})
