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
