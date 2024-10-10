import { LiveProject, LiveSet } from '../index.js'
import path from 'node:path'

const TEST_PROJECT_FOLDER = path.resolve('./testfiles/Test Project')
const TEST_PROJECT_NAME = 'Test Project'

test('loading a project', async () => {
	let _project = await new LiveProject(TEST_PROJECT_FOLDER)
	expect(_project.path).toBe(TEST_PROJECT_FOLDER)
	expect(_project.name).toBe('Test Project')
	expect(_project.liveSetPaths.length).toBe(1)
	expect(_project.liveSetPaths[0]).toBe(
		`${TEST_PROJECT_FOLDER}/${TEST_PROJECT_NAME}.als`,
	)
})

test('loading sets in a project', async () => {
	let _project = await new LiveProject(TEST_PROJECT_FOLDER)

	await _project.loadSets()

	// console.log(_project.liveSets)

	expect(_project.liveSets).toHaveLength(1)
	expect(_project.liveSets[0].info.name).toBe(`${TEST_PROJECT_NAME}.als`)
})
