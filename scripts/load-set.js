import { LiveSet } from '../index.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

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
} catch (error) {
	console.error(`Error loading set: ${error.message}`, error)
	process.exit(1)
}
