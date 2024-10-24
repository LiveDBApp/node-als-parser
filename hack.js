import { LiveProject } from './index.js'
import { findAlsFiles, findAbletonProjects } from './lib.js'
import path from 'node:path'
import _ from 'lodash-es'

let projects = await findAbletonProjects(
	'/Users/jeff/Library/CloudStorage/Dropbox/Music/Projects/Sonic Boom',
)

let mapped = await Promise.all(
	projects.valid.map(async (project) => {
		let files = await findAlsFiles(project.path)

		return {
			...project,
			files,
		}
	}),
)

// console.log(mapped)

let lines = _.map(mapped, (project) => {
	return ` - ${project.folderName.split(' Project').shift()}: ${
		project.files.length
	} tracks`
})

console.log(`
${_.size(mapped)} Projects Found:
${lines.join('\n')}
`)
