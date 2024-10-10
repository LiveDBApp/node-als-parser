import { Project } from './index.js'
import { findAlsFiles } from './lib.js'
import path from 'node:path'

// let files = await findAlsFiles('./testfiles')
let files = await findAlsFiles(
	'/Users/jeff/Library/CloudStorage/Dropbox/Music/Projects/Sonic Boom',
)
// /Users/jeff/Library/CloudStorage/Dropbox/Music/Projects
//
// console.log(`Found ${files.length} project files`)

// let project = await new Project(files[0])

function toTSV(project) {
	return [
		project.info.name,
		project.trackCount,
		project.version.app,
		`${project.version.majorVersion}.${project.version.minorVersion}.${project.version.buildNumber}`,
		Date(project.info.created),
		Date(project.info.modified),
	].join('\t')
}

// console.log(project.fileInfo)
// console.log(project.info)

// let _path =
// 	'/Users/jeff/Library/CloudStorage/Dropbox/Music/Projects/Continental Drifters/Sat May 14 Guitars Project/Backup/Sunday May 15 [2022-05-15 121605].als'

console.log(
	['Name', 'Track Count', 'App', 'Version', 'Created', 'Modified'].join('\t'),
)

files.forEach(async (file) => {
	let project = await new Project(file)

	// console.log(project.info.name)
	// console.log(project.info)
	console.log(toTSV(project))
})
