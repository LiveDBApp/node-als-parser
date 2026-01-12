import {
	parseXmlString,
	readZipContents,
	readZipContentsStreaming,
	getFileInfo,
	findAlsFiles,
	findAlsFilesStreaming,
	validateAbletonProject,
} from './lib.js'

import { stat, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { EventEmitter } from 'node:events'
export {
	findAlsFiles,
	findAlsFilesStreaming,
	findAbletonProjects,
	findAbletonProjectsStreaming,
	readZipContentsStreaming,
} from './lib.js'
import _ from 'lodash-es'

function dumpData(object, key) {
	let str = JSON.stringify(object, null, ' ')
	writeFileSync(`./tmp/${key}.json`, str)
}

export class LiveSet extends EventEmitter {
	#_raw
	#_parsed
	#_path
	#_fileinfo
	#_tempo

	constructor(path, options = {}) {
		super()
		this.#_path = path
		this.initialized = false

		// If autoInit is false, don't auto-initialize (for streaming use case)
		if (options.autoInit === false) {
			return this
		}

		// Default behavior: auto-initialize (backward compatible)
		return (async () => {
			await this.init()
			return this
		})()
	}

	// Static factory method that creates and reads in one step
	static async create(path) {
		const instance = new LiveSet(path, { autoInit: false })
		await instance.init()
		return instance
	}

	// Initialize the LiveSet (get file info and read)
	async init() {
		this.#_fileinfo = await getFileInfo(this.#_path)
		await this.read()
		return this
	}

	async read() {
		try {
			this.emit('progress', {
				stage: 'reading-file',
				percent: 0,
				path: this.#_path,
			})

			// Use streaming version for progress reporting
			for await (const event of readZipContentsStreaming(this.#_path)) {
				if (event.stage === 'complete') {
					this.#_raw = event.data
				} else if (event.stage === 'error') {
					this.emit('progress', { stage: 'error', error: event.error })
				} else {
					// Emit unzipping progress (0-50%)
					this.emit('progress', {
						stage: event.stage,
						percent: event.percent * 0.5,
						bytesRead: event.bytesRead,
						bytesTotal: event.bytesTotal,
					})
				}
			}
		} catch (e) {
			this.emit('progress', { stage: 'error', error: e.message })
			console.error('Error reading project file', e)
			throw new Error(`Error reading project file: ${this._path}`)
		}

		try {
			this.emit('progress', { stage: 'parsing-xml', percent: 50 })
			this.#_parsed = await parseXmlString(this.#_raw)

			this.emit('progress', { stage: 'parsing-complete', percent: 90 })
		} catch (e) {
			this.emit('progress', { stage: 'error', error: e.message })
			console.error('Error parsing xml', e)
			throw new Error(`Error parsing xml: ${this._path}`)
		}

		// Live 12.something changed from MasterTrack to MainTrack
		// TODO: some sort of abstraction for different versions?
		// need to investigate how often this happens

		if (
			_.has(this.#_parsed, 'LiveSet.MasterTrack.DeviceChain.Mixer.Tempo.Manual')
		) {
			this.#_tempo =
				this.#_parsed.LiveSet.MasterTrack.DeviceChain.Mixer.Tempo.Manual[
					'$'
				].Value
		} else if (
			_.has(this.#_parsed, 'LiveSet.MainTrack.DeviceChain.Mixer.Tempo.Manual')
		) {
			this.#_tempo =
				this.#_parsed.LiveSet.MainTrack.DeviceChain.Mixer.Tempo.Manual[
					'$'
				].Value
		} else {
			this.#_tempo = 'NaN'
		}

		this.initialized = true
		this.emit('progress', { stage: 'complete', percent: 100 })
	}

	get tempo() {
		return this.#_tempo
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

	get tempo() {
		return parseFloat(this.#_tempo).toFixed(2)
	}

	get info() {
		return {
			name: this.#_fileinfo.name,
			tempo: this.tempo,
			version: this.version,
			tracks: this.tracks,
			trackCount: this.trackCount,
			location: this.location,
			...this.#_fileinfo,
		}
	}
}

export class LiveProject extends EventEmitter {
	#_directory
	#_valid
	liveSets = []
	liveSetPaths = []

	constructor(directory) {
		super()
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
			this.name = _result.name

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
		const total = this.liveSetPaths.length
		let completed = 0

		this.emit('progress', {
			stage: 'loading-sets',
			completed: 0,
			total,
			percent: 0,
		})

		for (const setPath of this.liveSetPaths) {
			// Create LiveSet instance without auto-init to attach listeners first
			const liveSet = new LiveSet(setPath, { autoInit: false })

			// Attach event listeners before initialization
			liveSet.on('progress', (event) => {
				this.emit('set-progress', {
					path: setPath,
					setIndex: completed,
					...event,
				})
			})

			// Now initialize (read file info and parse)
			await liveSet.init()

			this.liveSets.push(liveSet)
			completed++

			this.emit('progress', {
				stage: 'loading-sets',
				completed,
				total,
				percent: (completed / total) * 100,
			})
		}

		this.emit('progress', {
			stage: 'complete',
			completed: total,
			total,
			percent: 100,
		})

		return true
	}
}
