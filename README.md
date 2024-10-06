# `node-als-parser`

Smallest possible library to parse ALS files.

```javascript
import { Project, findAlsFiles } from "node-als-parser";

let files = await findAlsFiles("./some/directory");

files.map(async file => {
  const project = new Project(file);
  await project project.read()
  console.log(project.version) // Ableton Live 11.3.21
})

```

This library:

- reads ALS files and extracts the version number from them.
- the utility function findAlsFiles is provided to search for ALS files in a directory recursively.

This library does _not_:

- use typescript
- need a lot of dependencies (only 1)
