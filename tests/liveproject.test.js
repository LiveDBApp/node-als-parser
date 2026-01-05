import { LiveProject, LiveSet } from '../index.js'
import path from 'node:path'

const TEST_PROJECT_PATH = path.resolve('./testfiles/Test Project')
const TEST_PROJECT_FOLDER = 'Test Project'
const TEST_PROJECT_NAME = 'Test'

test('loading a project', async () => {
	let _project = await new LiveProject(TEST_PROJECT_PATH)
	expect(_project.path).toBe(TEST_PROJECT_PATH)
	expect(_project.name).toBe('Test')
	expect(_project.liveSetPaths.length).toBe(1)
	expect(_project.liveSetPaths[0]).toBe(
		`${TEST_PROJECT_PATH}/${TEST_PROJECT_FOLDER}.als`,
	)
})

test('loading sets in a project', async () => {
	let _project = await new LiveProject(TEST_PROJECT_PATH)

	await _project.loadSets()

	expect(_project.liveSets).toHaveLength(1)
	expect(_project.liveSets[0].info.name).toBe(`${TEST_PROJECT_FOLDER}.als`)
})
