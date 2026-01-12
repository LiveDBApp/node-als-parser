# `node-als-parser`

Smallest possible library to work with Ableton Live Project directories and project files.

## Features

- ✅ Identifies Ableton "Project" directories
- ✅ Reads ALS files and extracts version numbers
- ✅ Provides access to more info about ALS files and Ableton Live projects
- ✅ **NEW:** Streaming progress events for large file operations
- ✅ **NEW:** AsyncGenerator functions for incremental results

## Installation

```bash
npm install node-als-parser
```

## Basic Usage

```javascript
import { LiveProject } from 'node-als-parser'
import { readdirSync } from 'fs'
import { join } from 'path'

let projectsPath = '~/Path/To/Ableton/Projects/'

let projectDirs = readdirSync(projectsPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => join(projectsPath, dirent.name))

console.log('projectDirs', projectDirs)

projectDirs.forEach(async (projectDir) => {
	let proj = await new LiveProject(projectDir)

	// this takes awhile, it's reading files and parsing xml
	await proj.loadSets()

	console.log(`Project: ${proj.name} has ${proj.liveSets.length} live sets:`)
	proj.liveSets.forEach((set) => {
		console.log(` - ${set.info.name} (${set.tempo} BPM)`)
	})
})
```

## Streaming API (NEW!)

For better UX with large files and directories, use the streaming API to get progress updates:

### LiveProject with Progress Events

```javascript
import { LiveProject } from 'node-als-parser'

const project = await new LiveProject('/path/to/My Project')

// Listen to overall project loading progress
project.on('progress', (event) => {
	console.log(
		`${event.stage}: ${event.completed}/${event.total} (${event.percent}%)`,
	)
})

// Listen to individual set loading progress
project.on('set-progress', (event) => {
	if (event.stage === 'processing') {
		console.log(
			`Loading ${event.path}: ${event.percent}% (${event.bytesRead} bytes)`,
		)
	}
})

await project.loadSets()
```

### Streaming File Search

Use AsyncGenerators to get results as they're discovered:

```javascript
import { findAlsFilesStreaming } from 'node-als-parser'

for await (const event of findAlsFilesStreaming('/path/to/music', {
	backups: false,
})) {
	if (event.type === 'scanning') {
		console.log(`Scanning: ${event.path}`)
	} else if (event.type === 'found') {
		console.log(`Found: ${event.file}`)
		// Process file immediately instead of waiting for all results
	} else if (event.type === 'complete') {
		console.log('Search complete!')
	}
}
```

### Streaming Project Discovery

```javascript
import { findAbletonProjectsStreaming } from 'node-als-parser'

for await (const event of findAbletonProjectsStreaming('/path/to/music')) {
	if (event.type === 'project-found' && event.isValid) {
		console.log(`Found project: ${event.project.name}`)
		// Start processing immediately
	}
}
```

### Streaming Zip File Reading

```javascript
import { readZipContentsStreaming } from 'node-als-parser'

for await (const event of readZipContentsStreaming('/path/to/file.als')) {
	if (event.stage === 'processing') {
		console.log(
			`Unzipping: ${event.percent}% (${event.bytesRead}/${event.bytesTotal} bytes)`,
		)
	} else if (event.stage === 'complete') {
		const contents = event.data
		// Use the unzipped XML contents
	}
}
```

## API Reference

### Classes

#### `LiveProject`

Extends `EventEmitter`. Represents an Ableton Live project directory.

**Events:**

- `progress` - Overall project loading progress
- `set-progress` - Individual set loading progress

**Methods:**

- `loadSets()` - Load all Live Sets in the project

#### `LiveSet`

Extends `EventEmitter`. Represents an individual .als file.

**Events:**

- `progress` - File reading and parsing progress

**Static Methods:**

- `LiveSet.create(path)` - Factory method that creates and initializes in one step

**Instance Methods:**

- `init()` - Initialize the LiveSet (read file info and parse)
- `read()` - Read and parse the .als file

### Functions

#### Streaming (AsyncGenerator)

- `findAlsFilesStreaming(directoryPath, options)` - Stream .als file search results
- `findAbletonProjectsStreaming(rootPath)` - Stream project discovery results
- `readZipContentsStreaming(zipFilePath)` - Stream unzip progress and results

#### Non-Streaming

- `findAlsFiles(directoryPath, options)` - Find all .als files (returns array)
- `findAbletonProjects(rootPath)` - Find all Ableton projects (returns object)
- `readZipContents(zipFilePath)` - Read and unzip .als file (returns string)
- `parseXmlString(xmlString)` - Parse XML string to object
- `getFileInfo(filePath)` - Get file metadata and SHA256 hash
- `validateAbletonProject(projectPath)` - Validate an Ableton project directory

## Notes

This library:

- Does _not_ use TypeScript
- Has minimal dependencies (only `xml2js`)
- Supports both traditional and streaming APIs for flexibility
- Provides detailed progress events for better UX
