import { LiveSet } from '../index.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'

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

async function dumpAlsToJson(alsFilePath, outputJsonPath) {
	try {
		const set = await new LiveSet(alsFilePath)
		console.log(`Set loaded: ${set.info.name}`)
		const jsonString = JSON.stringify(set.parsed, null, 2)

		fs.writeFileSync(
			`${outputJsonPath}/${set.info.name}.json`,
			jsonString,
			'utf8',
		)
		console.log(`Dumped ALS to JSON: ${outputJsonPath}/${set.info.name}.json`)
	} catch (error) {
		console.error('Error dumping ALS to JSON:', error)
		process.exit(1)
	}
}

const alsFilePath = argv.file

try {
	await dumpAlsToJson(alsFilePath, './tests/test-data/json')
} catch (error) {
	console.error('Error loading set:', error)
	process.exit(1)
}
