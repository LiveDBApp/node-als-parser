import { LiveSet } from '../index.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { findKeyPaths } from '../lib.js'
import { executeScript } from '@elastic/micro-jq'

const argv = yargs(hideBin(process.argv))
	.usage('Usage: $0 <file>')
	.command(
		'$0 <file>',
		'Load an Ableton Live set file and display its version',
		(yargs) => {
			yargs.positional('file', {
				describe: 'Path to the .als file to load',
				type: 'string',
			})
		},
	)
	.demandCommand(1, 'You must provide a path to an .als file')
	.help()
	.alias('help', 'h')
	.parseSync()

const alsFilePath = argv.file

try {
	const set = await new LiveSet(alsFilePath)

	console.log(`Set loaded: ${set.info.name}`)
	// console.log(
	// 	`Version: ${set.version.app} ${set.version.major}.${set.version.minor}.${set.version.patch}`,
	// )

	// 1. all audio files used in the set (with paths) SampleRef

	let srefs = findKeyPaths(set.parsed, 'SampleRef')
	console.log(`\nFound ${srefs.length} SampleRef entries in the set:`)

	// 2. all devices used in the set, grouped by device type? see PluginDesc for plugins

	let plugins = findKeyPaths(set.parsed, 'PluginDesc')
	// console.log(`\nFound ${plugins.length} PluginDesc entries in the set:`)

	// plugins.forEach((p, idx) => {
	// 	console.log(`  [${idx + 1}] Path: ${p}`)
	// })

	let devices = findKeyPaths(set.parsed, 'Devices')
	console.log('Found these devices: ')
	devices.forEach((p, idx) => {
		console.log(`  [${idx + 1}] Path: ${p}`)

		// TODO: given a path, get the data at that path or recover. Unsure if jq is the way here.
		// console.log('huh', executeScript(`'${p}'`, JSON.stringify(set.parsed)))
	})

	console.log('Devices found in the set:', devices.length)
} catch (error) {
	console.error(`Error loading set: ${error.message}`, error)
	process.exit(1)
}
