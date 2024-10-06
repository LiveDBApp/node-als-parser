import { parseXmlString, readZipContents, findAlsFiles } from "./lib.js";
import { stat } from "node:fs";

export default class Project {
  constructor(path) {
    this._path = path;
    this.initialized = false;
  }

  async read() {
    try {
      this._raw = await readZipContents(this._path);
    } catch (e) {
      console.error("Error reading project file", e);
      throw new Error(`Error reading project file: ${this._path}`);
    }

    try {
      this._parsed = await parseXmlString(this._raw);
    } catch (e) {
      console.error("Error parsing xml", e);
      throw new Error(`Error parsing xml: ${this._path}`);
    }

    this.initialized = true;
  }

  get tracks() {
    // return this._parsed.tracks.track
  }

  get trackCount() {
    // return this._parsed.tracks.track.length
  }

  get version() {
    return this._parsed["$"].Creator;
  }
}

export findAlsFiles

// console.log(parsed.$.Creator)

// let files = await findAlsFiles("./testfiles");

// console.log("files", files);

// // let project = new Project('./Michelle.als')

// // await project.read()

// files.map(async (file) => {
//   let _project = new Project(file);
//   await _project.read();

//   console.log(_project.version);
// });
