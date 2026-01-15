import { LiveProject } from '../index.js'
import { readdirSync } from 'fs'
import { join } from 'path'
import _ from 'lodash-es'

const pluginTypes = {
	AuPluginInfo: 'AU',
	VstPluginInfo: 'VST',
	Vst3PluginInfo: 'VST3',
}

function findPropertiesByKey(obj, targetKeys, currentPath = '', results = []) {
	// Handle arrays
	if (Array.isArray(obj)) {
		obj.forEach((item, index) => {
			findPropertiesByKey(item, targetKeys, `${currentPath}[${index}]`, results)
		})
	}
	// Handle objects
	else if (obj !== null && typeof obj === 'object') {
		for (const key in obj) {
			const newPath = currentPath ? `${currentPath}.${key}` : key

			// Check if this key matches one of our target keys
			if (targetKeys.includes(key)) {
				results.push({
					key: key,
					path: newPath,
					value: obj[key],
				})
			}

			// Recurse into nested structures
			findPropertiesByKey(obj[key], targetKeys, newPath, results)
		}
	}

	return results
}

function getValue(obj) {
	if (_.has(obj, '$.Value')) {
		return obj['$']?.Value
	} else {
		throw new Error(
			'Unexpected object structure: ' + JSON.stringify(obj, null, '  '),
		)
	}
}

function getPluginInfo(PluginDesc) {
	let _keys = _.keys(PluginDesc)

	if (_keys.includes('AuPluginInfo')) {
		return [pluginTypes.AuPluginInfo, getAuPluginInfo(PluginDesc)]
	} else if (_keys.includes('VstPluginInfo')) {
		return [pluginTypes.VstPluginInfo, getVstPluginInfo(PluginDesc)]
	} else if (_keys.includes('Vst3PluginInfo')) {
		return [pluginTypes.Vst3PluginInfo, getVst3PluginInfo(PluginDesc)]
	}

	return [] // wtf? clap??
}

function getAuPluginInfo(PluginDesc) {
	let auInfo = PluginDesc.AuPluginInfo
	return {
		name: getValue(auInfo.Name),
		manufacturer: getValue(auInfo.Manufacturer),
		path: null,
	}
}

function getVstPluginInfo(PluginDesc) {
	let vstInfo = PluginDesc.VstPluginInfo

	return {
		name: getValue(vstInfo.PlugName),
		manufacturer: null,
		path: getValue(vstInfo.Path),
	}
}

function getVst3PluginInfo(PluginDesc) {
	let vst3Info = PluginDesc.Vst3PluginInfo

	return {
		name: getValue(vst3Info.Name),
		path: null,
		manufacturer: null,
	}
}

const projectsPath = '/Users/jeff/Dropbox/Music/Projects/LiveDB Test Projects'

let projectDirs = readdirSync(projectsPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => join(projectsPath, dirent.name))

console.log('projectDirs', projectDirs)

// projectDirs.forEach(async (projectDir) => {
// 	let proj = await new LiveProject(projectDir)

// 	await proj.loadSets()

// 	console.log(`Project: ${proj.name} has ${proj.liveSets.length} live sets:`)
// 	proj.liveSets.forEach((set) => {
// 		console.log(` - ${set.info.name} (${set.tempo} BPM)`)
// 	})
// })

let target = projectDirs[0]

console.log('target', target)

let proj = await new LiveProject(target)

await proj.loadSets()

// console.log(`Project: ${proj.name} has ${proj.liveSets.length} live sets:`)
// proj.liveSets.forEach((set) => {
// 	console.log(` - ${set.info.name} (${set.tempo} BPM)`)
// })

// console.log('Project: ', proj.liveSets[0].info.tracks)

let set = proj.liveSets[0]

console.log('Set name:', set.info.name)
// console.log('Tracks:', _.keys(set.tracks))

let devices = set.getDeviceInfo()

console.log('devices', devices)

// console.log(devices.MidiTrack[1])

// console.log('XXX devices', devices)

// let tracks = proj.liveSets[0].info.tracks

// let types = _.keys(tracks)

// // console.log('types', types)

// console.log('Track types', types)

// // console.log('tracks', tracks['ReturnTrack'])

// types.forEach((type) => {
// 	// console.log(`Type: ${type} has ${tracks[type].length} tracks:`)
// 	console.log(type, _.isArray(tracks[type]))

// 	if (_.isArray(tracks[type])) {
// 		tracks[type].forEach((track) => {
// 			// console.log(track)

// 			let plugins = findPropertiesByKey(track, ['PluginDesc'])

// 			// console.log('plugins', plugins)

// 			// console.log(`  Track: ${track.Name} has ${plugins.length} plugins:`)

// 			plugins.forEach((pluginEntry) => {
// 				// console.log('value', pluginEntry.value)

// 				console.log('plugin Info', getPluginInfo(pluginEntry.value))
// 			})
// 		})
// 	} else {
// 		// console.log(tracks)
// 	}
// })
