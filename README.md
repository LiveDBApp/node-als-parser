# `node-als-parser`

Smallest possible library to work with Ableton Live Project directories and project files.

```javascript
import { LiveProject } from '../index.js'
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

This library:

- identifies Ableton "Project" directories
- reads ALS files and extracts the version number from them.
- provides access to more info about als files and Ableton Live projects in general.

This library does _not_:

- use typescript
- need a lot of dependencies (only 1, ['xml2js'](https://www.npmjs.com/package/xml2js) )
