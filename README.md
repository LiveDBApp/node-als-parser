# `node-als-parser`

Smallest possible library to parse ALS files.

```javascript
import { Project, findAlsFiles } from 'node-als-parser'

let files = await findAlsFiles('./some/directory')

files.map(async (file) => {
	const project = await new Project(file)
	console.log(project.version) // Ableton Live 11.3.21
})
```

This library:

- reads ALS files and extracts the version number from them.
- provides access to more info about als files and Ableton Live projects in general.
- the utility function findAlsFiles is provided to search for ALS files in a directory recursively.

This library does _not_:

- use typescript
- need a lot of dependencies (only 1)
