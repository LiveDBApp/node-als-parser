import { LiveProject } from '../index.js'
import { readdirSync } from 'fs'
import { join } from 'path'

let projectsPath = '/Users/jeff/Dropbox/Music/Projects/Sonic Boom'

let projectDirs = readdirSync(projectsPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => join(projectsPath, dirent.name))

console.log(`Found ${projectDirs.length} potential project directories\n`)

for (const projectDir of projectDirs) {
	try {
		let proj = await new LiveProject(projectDir)

		console.log(`\n${'='.repeat(60)}`)
		console.log(`Project: ${proj.name}`)
		console.log(`${'='.repeat(60)}`)
		console.log(`Path: ${proj.path}`)
		console.log(`Sets to load: ${proj.liveSetPaths.length}`)
		console.log()

		// Add progress listeners
		let loadedCount = 0

		proj.on('progress', (event) => {
			if (event.stage === 'loading-sets' && event.completed > loadedCount) {
				loadedCount = event.completed
				console.log(
					`  [${event.completed}/${event.total}] ${event.percent.toFixed(
						1,
					)}% complete`,
				)
			}
		})

		let currentSet = ''
		proj.on('set-progress', (event) => {
			const setName = event.path.split('/').pop()

			if (event.stage === 'reading-file' && setName !== currentSet) {
				currentSet = setName
				process.stdout.write(`    📄 ${setName}... `)
			} else if (event.stage === 'complete' && setName === currentSet) {
				console.log('✓')
			}
		})

		await proj.loadSets()

		console.log(`\nLoaded ${proj.liveSets.length} live sets:`)
		proj.liveSets.forEach((set) => {
			console.log(`  • ${set.info.name}`)
			console.log(
				`    ${set.tempo} BPM | ${set.trackCount} tracks | v${set.version.major}.${set.version.minor}.${set.version.patch}`,
			)
		})
	} catch (error) {
		console.error(`\n✗ Error with ${projectDir}:`, error)
	}
}

console.log(`\n${'='.repeat(60)}`)
console.log('All projects processed!')
console.log(`${'='.repeat(60)}`)
