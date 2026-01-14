import * as lib from '../lib.js'
import _ from 'lodash-es'

const TEST_FILE_PATH = './tests/test-data/projects/Michelle.als'
const TEST_PROJECT_FOLDER = './tests/test-data/projects/Test Project'

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
	let files = await lib.findAlsFiles('./tests/test-data/projects/')
	// console.log(files.length)

	expect(files.length).toBe(5)

	let filenames = files.map((f) => f.split('/').pop())
	expect(filenames).toContain('Michelle.als')
	expect(filenames).toContain('Test Project.als')
})

test('validating a project folder', async () => {
	let results = await lib.validateAbletonProject(TEST_PROJECT_FOLDER)
	// console.log(results)
	expect(results.isValid).toBe(true)
})

test('failing a non-existent folder', async () => {
	let results = await lib.validateAbletonProject('./foobarbaz')

	// expect(1).toBe(1)
	expect(results.isValid).toBe(false)
	expect(results.errors[0]).toBe('Path does not exist')
})

test('finding ableton project directories', async () => {
	let results = await lib.findAbletonProjects('./tests/test-data/projects/')

	expect(results.valid.length).toBe(3)
	expect(results.invalid.length).toBe(1)
	expect(results.invalid[0].isValid).toBe(false)

	/**
	 *  [
        'No .als files found in directory',
        "'Ableton Project Info' folder not found"
      ]
	 */

	expect(results.invalid[0].errors.length).toBe(2)
})
