import { LiveProject } from '../index.js'
import { readdirSync } from 'fs'
import { join } from 'path'

let projectsPath = '/Users/jeff/Dropbox/Music/Projects/Sonic Boom'

let projectDirs = readdirSync(projectsPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => join(projectsPath, dirent.name))

console.log('projectDirs', projectDirs)

projectDirs.forEach(async (projectDir) => {
	let proj = await new LiveProject(projectDir)

	await proj.loadSets()

	console.log(`Project: ${proj.name} has ${proj.liveSets.length} live sets:`)
	proj.liveSets.forEach((set) => {
		console.log(` - ${set.info.name} (${set.tempo} BPM)`)
	})
})
