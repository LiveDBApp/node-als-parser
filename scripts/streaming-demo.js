import {
	LiveProject,
	findAlsFilesStreaming,
	findAbletonProjectsStreaming,
} from '../index.js'
import { join } from 'path'

console.log('=== Streaming Demo ===\n')

// Demo 1: Streaming file search
console.log('1. Streaming ALS file search:')
console.log('--------------------------------')
const testPath = join(process.cwd(), 'testfiles')
let filesFound = []

for await (const event of findAlsFilesStreaming(testPath, { backups: false })) {
	if (event.type === 'scanning') {
		console.log(`📂 Scanning: ${event.path}`)
	} else if (event.type === 'found') {
		console.log(`✓ Found: ${event.file}`)
		filesFound.push(event.file)
	} else if (event.type === 'error') {
		console.log(`✗ Error: ${event.error}`)
	} else if (event.type === 'complete') {
		console.log(`\n✓ Search complete! Found ${filesFound.length} files\n`)
	}
}

// Demo 2: Streaming project search
console.log('2. Streaming project search:')
console.log('--------------------------------')
let validProjects = []
let invalidProjects = []

for await (const event of findAbletonProjectsStreaming(testPath)) {
	if (event.type === 'scanning') {
		console.log(`📂 Scanning: ${event.path}`)
	} else if (event.type === 'validating') {
		console.log(`🔍 Validating: ${event.path}`)
	} else if (event.type === 'project-found') {
		if (event.isValid) {
			console.log(`✓ Valid project: ${event.project.name}`)
			validProjects.push(event.project)
		} else {
			console.log(`✗ Invalid project: ${event.project.path}`)
			invalidProjects.push(event.project)
		}
	} else if (event.type === 'complete') {
		console.log(
			`\n✓ Found ${validProjects.length} valid, ${invalidProjects.length} invalid projects\n`,
		)
	}
}

// Demo 3: LiveProject with progress events
if (validProjects.length > 0) {
	console.log('3. Loading LiveProject with progress events:')
	console.log('--------------------------------')

	const projectPath = validProjects[0].path
	const project = await new LiveProject(projectPath)

	console.log(`Project: ${project.name}`)
	console.log(`Found ${project.liveSetPaths.length} live sets\n`)

	// Listen to progress events
	project.on('progress', (event) => {
		if (event.stage === 'loading-sets') {
			console.log(
				`📦 Loading sets: ${event.completed}/${
					event.total
				} (${event.percent.toFixed(1)}%)`,
			)
		} else if (event.stage === 'complete') {
			console.log(`✓ All sets loaded!\n`)
		}
	})

	project.on('set-progress', (event) => {
		if (event.stage === 'reading-file') {
			console.log(`  📄 Reading: ${event.path}`)
		} else if (event.stage === 'unzipping' || event.stage === 'processing') {
			const percent = event.percent?.toFixed(0) || 0
			const bytes = event.bytesRead
				? `(${(event.bytesRead / 1024).toFixed(1)} KB)`
				: ''
			console.log(`  ⚙️  ${event.stage}: ${percent}% ${bytes}`)
		} else if (event.stage === 'parsing-xml') {
			console.log(`  🔍 Parsing XML: ${event.percent}%`)
		} else if (event.stage === 'complete') {
			console.log(`  ✓ Set loaded`)
		} else if (event.stage === 'error') {
			console.log(`  ✗ Error: ${event.error}`)
		}
	})

	await project.loadSets()

	console.log('\n4. Loaded sets summary:')
	console.log('--------------------------------')
	project.liveSets.forEach((set, i) => {
		console.log(
			`${i + 1}. ${set.info.name} - ${set.tempo} BPM (${
				set.trackCount
			} tracks)`,
		)
	})
}

console.log('\n=== Demo Complete ===')
