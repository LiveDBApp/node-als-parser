import fs from 'node:fs'
import path from 'node:path'
import _ from 'lodash-es'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

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

	return null // wtf? clap??
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

// Load and search the JSON file

// tests/test-data/json/live-12.3-plugin-types.als.json
const jsonPath = path.join(
	__dirname,
	'../tests/test-data/json/live-12.3-batteries-incl.als.json',
)
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

const plugPath = path.join(
	__dirname,
	'../tests/test-data/json/live-12.3-plugin-types.als.json',
)
const plugData = JSON.parse(fs.readFileSync(plugPath, 'utf8'))

// 1. getting third party plugin info

const pluginKeys = ['PluginDesc']
const pluginResults = findPropertiesByKey(plugData, pluginKeys)

// pluginResults.length = 1

console.log(`Found ${pluginResults.length} plugin occurrences:`)
pluginResults.forEach((result, index) => {
	console.log(`\n[${index + 1}] ${result.key} at ${result.path}`)
	let pluginType = getPluginInfo(result.value)

	console.log('plugintype', pluginType)
})

// 2. built-in ableton devices

// 3. get audio file info and type

function getSampleType(_path) {
	let parts = _path.split(path.sep)
	let projectRoot = _.slice(parts, -4)[0]

	if (['Samples'].includes(projectRoot)) {
		projectRoot = _.slice(parts, -5)[0]
	}

	console.log('projectRoot', projectRoot)

	if (projectRoot.endsWith(' Project')) {
		// console.log('this is a project')
		// console.log('Projectroot: ', projectRoot)
		console.log('Project', _.slice(parts, -3)[0])
		return _.slice(parts, -2)[0].toLowerCase()
	} else {
		return 'external'
	}
}

function getSampleInfo(sampleRef) {
	// console.log('SampleRef info:', sampleRef.value.FileRef)
	let _path = getValue(sampleRef.value.FileRef.Path)

	let type = getSampleType(_path)

	return {
		path: _path,
		size: sampleRef.value.FileRef.OriginalFileSize['$'].Value,
		type,
	}
}

const sampleKeys = ['SampleRef']
const sampleResults = findPropertiesByKey(data, sampleKeys)

// sampleResults.length = 1

// console.log('Device sampleResults', sampleResults[0].value.FileRef)

sampleResults.forEach((result, index) => {
	// console.log(`\n[${index + 1}] ${result.key} at ${result.path}`)
	let sampleInfo = getSampleInfo(result)

	// sampleInfo.type = getSampleType(sampleInfo)

	console.log('sampleInfo', sampleInfo)
})

const targetKeys = ['DeviceChain']
const results = findPropertiesByKey(data, targetKeys)

// console.log('Results', results)

console.log(
	'Devices in All Effects track',
	_.keys(data.LiveSet.Tracks.AudioTrack[1].DeviceChain.DeviceChain.Devices),
)

// console.log(
// 	'Devices in First MIDI track ( track 3 )',
// )

_.each(data.LiveSet.Tracks.MidiTrack, (track, idx) => {
	let _name = track.Name.EffectiveName['$'].Value
	console.log(
		`Devices in MIDI Track ${idx + 1} '${_name}'`,
		_.keys(track.DeviceChain.DeviceChain.Devices),
	)
})

// Device names are the keys in this Devices Object!!!

// console.log(
// 	'Devices in Track 2',
// 	data.LiveSet.Tracks.AudioTrack[1].DeviceChain.DeviceChain.Devices,
// )
// results.length = 1
