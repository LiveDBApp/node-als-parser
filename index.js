import {
	parseXmlString,
	readZipContents,
	getFileInfo,
	findAlsFiles,
	validateAbletonProject,
} from './lib.js'

import { stat } from 'node:fs'
import { basename } from 'node:path'
export { findAlsFiles, findAbletonProjects } from './lib.js'

export class LiveSet {
	#_raw
	#_parsed
	#_path
	#_fileinfo

	constructor(path) {
		this.#_path = path
		this.initialized = false

		return (async () => {
			this.#_fileinfo = await getFileInfo(this.#_path)
			await this.read()
			return this
		})()
	}

	async read() {
		try {
			this.#_raw = await readZipContents(this.#_path)
		} catch (e) {
			console.error('Error reading project file', e)
			throw new Error(`Error reading project file: ${this._path}`)
		}

		try {
			this.#_parsed = await parseXmlString(this.#_raw)
		} catch (e) {
			console.error('Error parsing xml', e)
			throw new Error(`Error parsing xml: ${this._path}`)
		}

		this.initialized = true
	}

	get tracks() {
		return this.#_parsed.LiveSet.Tracks
	}

	get trackCount() {
		// return this._parsed.tracks.track.length
		let _tracks = this.#_parsed.LiveSet.Tracks
		let count = 0

		if ('AudioTrack' in _tracks && _tracks['AudioTrack'].length > 0) {
			count += _tracks['AudioTrack'].length
		}

		if ('MidiTrack' in _tracks && _tracks['MidiTrack'].length > 0) {
			count += _tracks['MidiTrack'].length
		}

		return count
	}

	get version() {
		let regex = /([a-zA-Z\ ]+)\ ([0-9]+)\.([\d]+)\.([\d]+)?/
		let pieces = regex.exec(this.#_parsed['$'].Creator)
		return {
			app: pieces[1],
			major: parseInt(pieces[2]),
			minor: parseInt(pieces[3]),
			patch: parseInt(pieces[4]) || 0,
		}
	}

	get location() {
		return this.#_path
	}

	get fileInfo() {
		return this.#_fileinfo
	}

	get info() {
		return {
			name: this.#_fileinfo.name,
			version: this.version,
			tracks: this.tracks,
			trackCount: this.trackCount,
			location: this.location,
			info: this.fileInfo,
		}
	}
}

export class LiveProject {
	#_directory
	#_valid
	liveSets = []
	liveSetPaths = []

	constructor(directory) {
		this.#_directory = directory
		this.path = false
		this.name = false

		return (async () => {
			// async code goes here
			let _result = await validateAbletonProject(directory)
			if (_result.isValid !== true) {
				throw `Directory ${directory} isn't an ableton project:\n ${_result.errors.join(
					'\n',
				)}`
			}
			this.#_valid = true
			this.path = _result.path
			this.name = _result.folderName.split(' Project').shift()

			this.liveSetPaths = await findAlsFiles(this.#_directory, {
				backups: false,
			})

			return this
		})()
	}

	get isValid() {
		return this.#_valid
	}

	async loadSets() {
		let map = this.liveSetPaths.map((path) => {
			return new LiveSet(path)
		})

		this.liveSets = await Promise.all(map)

		return true
	}
}
