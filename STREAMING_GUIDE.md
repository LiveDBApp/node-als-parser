# Streaming API Guide

This guide explains the new streaming capabilities added to `node-als-parser` for better progress reporting and memory efficiency when working with large Ableton projects.

## Overview

The library now supports two programming models:

1. **Traditional API** - Simple, blocking calls that return complete results
2. **Streaming API** - AsyncGenerators and EventEmitters for progress updates and incremental results

## Why Streaming?

When working with large Ableton projects:

- **User Experience**: Show progress bars and status updates
- **Memory Efficiency**: Process files as they're discovered instead of loading everything
- **Responsiveness**: Start processing immediately instead of waiting for all results
- **Error Handling**: Continue processing even if individual files fail

## Quick Examples

### Basic Usage (Traditional)

```javascript
import { LiveProject } from 'node-als-parser'

const project = await new LiveProject('/path/to/My Project')
await project.loadSets()

console.log(`Loaded ${project.liveSets.length} sets`)
```

### With Progress Events (Streaming)

```javascript
import { LiveProject } from 'node-als-parser'

const project = await new LiveProject('/path/to/My Project')

project.on('progress', ({ stage, completed, total, percent }) => {
	console.log(`${stage}: ${completed}/${total} (${percent.toFixed(1)}%)`)
})

project.on('set-progress', ({ path, stage, percent, bytesRead }) => {
	console.log(`  ${path}: ${stage} ${percent?.toFixed(0)}%`)
})

await project.loadSets()
```

## Streaming Functions

### 1. findAlsFilesStreaming()

Search for .als files with real-time results:

```javascript
import { findAlsFilesStreaming } from 'node-als-parser'

const files = []

for await (const event of findAlsFilesStreaming('/music', { backups: false })) {
	switch (event.type) {
		case 'scanning':
			console.log(`📂 ${event.path}`)
			break

		case 'found':
			console.log(`✓ ${event.file}`)
			files.push(event.file)
			// Can start processing immediately!
			break

		case 'error':
			console.error(`✗ ${event.path}: ${event.error}`)
			break

		case 'complete':
			console.log(`Found ${files.length} files`)
			break
	}
}
```

**Event Types:**

- `scanning` - Currently scanning a directory
- `found` - Discovered an .als file
- `error` - Error accessing a path
- `complete` - Search finished

### 2. findAbletonProjectsStreaming()

Discover Ableton projects as they're found:

```javascript
import { findAbletonProjectsStreaming } from 'node-als-parser'

for await (const event of findAbletonProjectsStreaming('/music')) {
	switch (event.type) {
		case 'scanning':
			console.log(`Scanning: ${event.path}`)
			break

		case 'validating':
			console.log(`Validating: ${event.path}`)
			break

		case 'project-found':
			if (event.isValid) {
				console.log(`✓ Valid: ${event.project.name}`)
				// Start working with project immediately
			} else {
				console.log(`✗ Invalid: ${event.project.path}`)
				console.log(`  Errors: ${event.project.errors.join(', ')}`)
			}
			break

		case 'error':
			console.error(`Error: ${event.path}`)
			break

		case 'complete':
			console.log('Search complete')
			break
	}
}
```

**Event Types:**

- `scanning` - Scanning a directory
- `validating` - Validating a potential project
- `project-found` - Found a project (valid or invalid)
- `error` - Error accessing a path
- `complete` - Search finished

### 3. readZipContentsStreaming()

Monitor unzip progress for large .als files:

```javascript
import { readZipContentsStreaming } from 'node-als-parser'

for await (const event of readZipContentsStreaming('/path/to/Large.als')) {
	switch (event.stage) {
		case 'reading':
			console.log(`Reading file: ${event.file}`)
			break

		case 'unzipping':
			console.log(`Unzipping: ${event.percent}%`)
			break

		case 'processing':
			const mb = (event.bytesRead / 1024 / 1024).toFixed(2)
			console.log(`Processing: ${event.percent.toFixed(0)}% (${mb} MB)`)
			break

		case 'complete':
			const xmlContent = event.data
			console.log('Unzip complete!')
			break

		case 'error':
			console.error(`Error: ${event.error}`)
			break
	}
}
```

**Event Stages:**

- `reading` - Reading the file from disk
- `unzipping` - Starting decompression
- `processing` - Actively decompressing (with byte progress)
- `complete` - Finished (includes `data` property with XML content)
- `error` - Error occurred

## Class-based API with Events

### LiveSet Events

```javascript
import { LiveSet } from 'node-als-parser'

// Create without auto-init to attach listeners
const liveSet = new LiveSet('/path/to/file.als', { autoInit: false })

liveSet.on('progress', (event) => {
	console.log(`${event.stage}: ${event.percent}%`)
})

// Now initialize
await liveSet.init()

// Or use the traditional auto-init:
const set = await new LiveSet('/path/to/file.als')
```

**Progress Events:**

- `reading-file` - Starting to read
- `unzipping` / `processing` - Decompressing
- `parsing-xml` - Parsing the XML
- `complete` - Fully initialized
- `error` - Error occurred

### LiveProject Events

```javascript
import { LiveProject } from 'node-als-parser'

const project = await new LiveProject('/path/to/My Project')

// Overall loading progress
project.on('progress', ({ stage, completed, total, percent }) => {
	if (stage === 'loading-sets') {
		console.log(`Loading: ${completed}/${total} (${percent}%)`)
	}
})

// Individual set progress
project.on('set-progress', ({ path, setIndex, stage, percent, bytesRead }) => {
	console.log(`[${setIndex}] ${path}`)
	console.log(`  ${stage}: ${percent}%`)
})

await project.loadSets()
```

**Progress Events:**

- `loading-sets` - Loading live sets
- `complete` - All sets loaded

**Set-Progress Events:**
Forwards all events from individual LiveSet instances with additional context:

- `path` - Path to the .als file
- `setIndex` - Index in the loading queue
- Plus all standard LiveSet progress properties

## Backward Compatibility

All existing code continues to work without changes:

```javascript
// This still works exactly as before
const project = await new LiveProject('/path')
await project.loadSets()

// This too
const set = await new LiveSet('/path/to/file.als')
console.log(set.tempo)
```

The streaming features are purely additive and opt-in.

## Best Practices

### 1. Use Streaming for Large Directories

```javascript
// Good: Start processing immediately
for await (const event of findAlsFilesStreaming('/huge/library')) {
	if (event.type === 'found') {
		processFile(event.file) // Don't wait for all files
	}
}

// Less ideal: Wait for everything
const files = await findAlsFiles('/huge/library')
files.forEach(processFile)
```

### 2. Provide User Feedback

```javascript
const project = await new LiveProject(projectPath)

// Show a progress bar
project.on('progress', ({ percent }) => {
	updateProgressBar(percent)
})

// Show detailed status
project.on('set-progress', ({ path, stage }) => {
	updateStatus(`Loading ${path.split('/').pop()}: ${stage}`)
})

await project.loadSets()
```

### 3. Handle Errors Gracefully

```javascript
for await (const event of findAbletonProjectsStreaming(rootPath)) {
	if (event.type === 'project-found') {
		if (event.isValid) {
			await loadProject(event.project)
		} else {
			console.warn(`Skipping invalid project: ${event.project.errors}`)
		}
	} else if (event.type === 'error') {
		console.error(`Access error: ${event.error}`)
		// Continue processing other directories
	}
}
```

### 4. Attach Event Listeners Before Initialization

```javascript
// Correct: Listeners attached before init
const set = new LiveSet(path, { autoInit: false })
set.on('progress', handleProgress)
await set.init()

// Won't work: Events already fired
const set = await new LiveSet(path)
set.on('progress', handleProgress) // Too late!
```

## Performance Considerations

- **Streaming functions** emit an event per file/directory, which may be slower for small operations but provides better UX
- **Traditional functions** are faster for small datasets when progress isn't needed
- **Memory usage** is similar for both approaches, but streaming allows earlier garbage collection
- The file reading itself uses true Node.js streams for efficient memory usage

## Example: Build a Progress UI

```javascript
import { LiveProject } from 'node-als-parser'

async function loadProjectWithUI(projectPath) {
	const project = await new LiveProject(projectPath)

	let currentFile = ''

	project.on('progress', ({ stage, completed, total, percent }) => {
		if (stage === 'loading-sets') {
			console.clear()
			console.log(`Loading ${project.name}`)
			console.log(`Progress: ${completed}/${total} sets`)
			console.log(progressBar(percent))
			console.log(`\nCurrent: ${currentFile}`)
		}
	})

	project.on('set-progress', ({ path, stage, percent }) => {
		currentFile = `${path.split('/').pop()} - ${stage} (${
			percent?.toFixed(0) || 0
		}%)`
	})

	await project.loadSets()

	console.clear()
	console.log(`✓ Loaded ${project.liveSets.length} sets`)
}

function progressBar(percent, width = 40) {
	const filled = Math.round((width * percent) / 100)
	const empty = width - filled
	return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percent.toFixed(1)}%`
}
```

## Migration Guide

If you want to add progress to existing code:

**Before:**

```javascript
const project = await new LiveProject(path)
await project.loadSets()
console.log('Done!')
```

**After:**

```javascript
const project = await new LiveProject(path)

project.on('progress', ({ percent }) => {
	console.log(`Progress: ${percent}%`)
})

await project.loadSets()
console.log('Done!')
```

That's it! Just add event listeners before calling `loadSets()`.
