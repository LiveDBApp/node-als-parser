import { promises as fs } from 'node:fs'
import { createUnzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { promisify } from 'node:util'
import xml2js from 'xml2js'
import path from 'node:path'
import { createReadStream } from 'fs'
import { createHash } from 'crypto'
import { EventEmitter } from 'node:events'
import _ from 'lodash-es'

const streamToBuffer = async (stream) => {
	const chunks = []
	for await (const chunk of stream) {
		chunks.push(chunk)
	}
	return Buffer.concat(chunks)
}

export function findKeyPaths(obj, targetKey, currentPath = []) {
	const results = []

	if (obj === null || obj === undefined) {
		return results
	}

	// Check if current object has the target key
	if (typeof obj === 'object') {
		for (const key in obj) {
			if (key === targetKey) {
				// Found the target key, add the path
				results.push([...currentPath, key].join('.'))
			}

			// Recursively search in the value
			const value = obj[key]
			if (typeof value === 'object' && value !== null) {
				results.push(...findKeyPaths(value, targetKey, [...currentPath, key]))
			}
		}
	}

	return results
}

export function getSampleRefs(data) {
	const allResults = findKeyPaths(data, 'SampleRef')

	console.log('allResults', allResults)

	return allResults
}

export async function readZipContents(zipFilePath) {
	try {
		// Read the zip file
		const zipData = await fs.readFile(zipFilePath)

		// Create unzip stream
		const unzip = createUnzip()
		const readableStream = Readable.from(zipData)

		// Pipe the zip data through the unzip stream
		const unzippedStream = readableStream.pipe(unzip)

		// Convert stream to buffer, then to string
		const unzippedBuffer = await streamToBuffer(unzippedStream)
		const contents = unzippedBuffer.toString('utf-8')

		return contents
	} catch (error) {
		throw new Error(`Error reading zip file: ${error.message}`)
	}
}

export async function* readZipContentsStreaming(zipFilePath) {
	try {
		yield { stage: 'reading', percent: 0, file: zipFilePath }

		const stats = await fs.stat(zipFilePath)
		const totalSize = stats.size
		const fileStream = createReadStream(zipFilePath)

		yield { stage: 'unzipping', percent: 25, bytesTotal: totalSize }

		const unzip = createUnzip()
		const unzippedStream = fileStream.pipe(unzip)

		const chunks = []
		let bytesRead = 0

		for await (const chunk of unzippedStream) {
			chunks.push(chunk)
			bytesRead += chunk.length
			// Progress from 25% to 95% during unzipping
			const progress = Math.min(95, 25 + (bytesRead / totalSize) * 70)
			yield {
				stage: 'processing',
				percent: progress,
				bytesRead,
				bytesTotal: totalSize,
			}
		}

		const contents = Buffer.concat(chunks).toString('utf-8')
		yield { stage: 'complete', percent: 100, data: contents }
		return contents
	} catch (error) {
		yield { stage: 'error', error: error.message }
		throw new Error(`Error reading zip file: ${error.message}`)
	}
}

export async function parseXmlString(xmlString) {
	try {
		const parser = new xml2js.Parser({
			explicitArray: false, // Don't create arrays for single elements
			trim: true, // Trim whitespace
			explicitRoot: false, // Don't wrap the result in a root key
		})

		// Convert parser.parseString to a promise-based function
		const parseString = (data) => {
			return new Promise((resolve, reject) => {
				parser.parseString(data, (err, result) => {
					if (err) reject(err)
					else resolve(result)
				})
			})
		}

		const result = await parseString(xmlString)
		return result
	} catch (error) {
		throw new Error(`Error parsing XML: ${error.message}`)
	}
}

export async function findAlsFiles(directoryPath, options) {
	const alsFiles = []
	let _directoryPath

	if (!path.isAbsolute(directoryPath)) {
		_directoryPath = path.normalize(process.cwd(), directoryPath)
	}

	if (!options) {
		options = { backups: false }
	}

	async function recursiveSearch(currentPath) {
		function isBackupFile(p) {
			let _fname = path.basename(p)
			let _dir = path.dirname(p).split(path.sep).pop()

			return _dir === 'Backup'
		}
		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name)

				if (entry.isDirectory()) {
					await recursiveSearch(fullPath)
				} else if (entry.isFile() && path.extname(entry.name) === '.als') {
					if (options.backups === false) {
						if (!isBackupFile(fullPath)) {
							alsFiles.push(path.resolve(fullPath))
						}
					} else {
						alsFiles.push(path.resolve(fullPath))
					}
				}
			}
		} catch (error) {
			console.error(`Error accessing ${currentPath}: ${error.message}`)
		}
	}

	await recursiveSearch(directoryPath)
	return alsFiles
}

export async function* findAlsFilesStreaming(directoryPath, options) {
	let _directoryPath

	if (!path.isAbsolute(directoryPath)) {
		_directoryPath = path.normalize(process.cwd(), directoryPath)
	}

	if (!options) {
		options = { backups: false }
	}

	function isBackupFile(p) {
		let _dir = path.dirname(p).split(path.sep).pop()
		return _dir === 'Backup'
	}

	async function* recursiveSearch(currentPath, depth = 0) {
		yield {
			type: 'scanning',
			path: currentPath,
			depth,
		}

		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name)

				if (entry.isDirectory()) {
					yield* recursiveSearch(fullPath, depth + 1)
				} else if (entry.isFile() && path.extname(entry.name) === '.als') {
					const shouldInclude =
						options.backups === true || !isBackupFile(fullPath)
					if (shouldInclude) {
						yield {
							type: 'found',
							file: path.resolve(fullPath),
							depth,
						}
					}
				}
			}
		} catch (error) {
			yield {
				type: 'error',
				path: currentPath,
				error: error.message,
			}
		}
	}

	yield* recursiveSearch(directoryPath)
	yield { type: 'complete' }
}

async function calculateFileSha256(filePath) {
	return new Promise((resolve, reject) => {
		const hash = createHash('sha256')
		const stream = createReadStream(filePath)

		stream.on('error', (error) => {
			reject(new Error(`Error reading file: ${error.message}`))
		})

		stream.on('data', (chunk) => {
			hash.update(chunk)
		})

		stream.on('end', () => {
			resolve(hash.digest('hex'))
		})
	})
}

export async function getFileInfo(filePath) {
	try {
		const stats = await fs.stat(filePath)

		const hash = await calculateFileSha256(filePath)

		return {
			name: path.basename(filePath),
			path: filePath,
			size: stats.size,
			sha256: hash,
			created: stats.birthtimeMs,
			modified: stats.mtimeMs,
		}
	} catch (error) {
		throw new Error(`Error processing file: ${error.message}`)
	}
}

async function resolvePath(inputPath) {
	try {
		// Resolve the absolute path
		const absolutePath = path.resolve(inputPath)

		try {
			// Check if path exists
			await fs.access(absolutePath)
			return {
				original: inputPath,
				resolved: absolutePath,
				exists: true,
				isDirectory: (await fs.stat(absolutePath)).isDirectory(),
			}
		} catch {
			// Path doesn't exist
			return {
				original: inputPath,
				resolved: absolutePath,
				exists: false,
				isDirectory: null,
			}
		}
	} catch (error) {
		throw new Error(`Error processing path: ${error.message}`)
	}
}

export async function validateAbletonProject(projectPath) {
	// Resolve the absolute path
	const absolutePath = path.resolve(projectPath)
	try {
		// Check 1: Path exists and is a directory
		const stats = await fs.stat(absolutePath)
		if (!stats.isDirectory()) {
			return {
				isValid: false,
				path: absolutePath,
				errors: ['Path is not a directory'],
			}
		}

		const errors = []

		// Check 2: Folder name ends with ' Project'
		const folderName = path.basename(absolutePath)
		if (!folderName.endsWith(' Project')) {
			errors.push("Folder name does not end with ' Project'")
		}

		// Check 3: Contains .als files
		let hasAlsFiles = false
		let infoFolderExists = false

		const entries = await fs.readdir(absolutePath, { withFileTypes: true })

		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith('.als')) {
				hasAlsFiles = true
			}
			if (entry.isDirectory() && entry.name === 'Ableton Project Info') {
				infoFolderExists = true
			}
		}

		if (!hasAlsFiles) {
			errors.push('No .als files found in directory')
		}

		// Check 4: Contains 'Ableton Project Info' folder
		if (!infoFolderExists) {
			errors.push("'Ableton Project Info' folder not found")
		}

		return {
			isValid: errors.length === 0,
			path: absolutePath,
			name: folderName.split(' Project').shift(),
			errors: errors.length > 0 ? errors : undefined,
		}
	} catch (error) {
		if (error.code === 'ENOENT') {
			return {
				isValid: false,
				path: absolutePath,
				errors: ['Path does not exist'],
			}
		}
		throw new Error(`Error validating project: ${error.message}`)
	}
}

export async function findAbletonProjects(rootPath) {
	const projects = {
		valid: [],
		invalid: [],
	}

	async function recursiveSearch(currentPath) {
		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name)

				if (entry.isDirectory()) {
					if (entry.name.endsWith(' Project')) {
						// Validate the potential Ableton project
						const validation = await validateAbletonProject(fullPath)
						if (validation.isValid) {
							projects.valid.push(validation)
						} else {
							projects.invalid.push(validation)
						}
					} else {
						// Recursively search other directories
						await recursiveSearch(fullPath)
					}
				}
			}
		} catch (error) {
			console.error(`Error accessing ${currentPath}: ${error.message}`)
		}
	}

	await recursiveSearch(path.resolve(rootPath))
	return projects
}

export async function* findAbletonProjectsStreaming(rootPath) {
	async function* recursiveSearch(currentPath, depth = 0) {
		yield {
			type: 'scanning',
			path: currentPath,
			depth,
		}

		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name)

				if (entry.isDirectory()) {
					if (entry.name.endsWith(' Project')) {
						// Validate the potential Ableton project
						yield { type: 'validating', path: fullPath }
						const validation = await validateAbletonProject(fullPath)

						if (validation.isValid) {
							yield {
								type: 'project-found',
								project: validation,
								isValid: true,
							}
						} else {
							yield {
								type: 'project-found',
								project: validation,
								isValid: false,
							}
						}
					} else {
						// Recursively search other directories
						yield* recursiveSearch(fullPath, depth + 1)
					}
				}
			}
		} catch (error) {
			yield {
				type: 'error',
				path: currentPath,
				error: error.message,
			}
		}
	}

	yield* recursiveSearch(path.resolve(rootPath))
	yield { type: 'complete' }
}

// Utility function to find all properties by key in a nested object

export function findPropertiesByKey(
	obj,
	targetKeys,
	currentPath = '',
	results = [],
) {
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

export function getValue(obj) {
	if (_.has(obj, '$.Value')) {
		return obj['$']?.Value
	} else {
		throw new Error(
			'Unexpected object structure: ' + JSON.stringify(obj, null, '  '),
		)
	}
}

export const pluginTypes = {
	AuPluginInfo: 'AU',
	VstPluginInfo: 'VST',
	Vst3PluginInfo: 'VST3',
}

export function getPluginInfo(PluginDesc) {
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

export function getAuPluginInfo(PluginDesc) {
	let auInfo = PluginDesc.AuPluginInfo
	return {
		name: getValue(auInfo.Name),
		manufacturer: getValue(auInfo.Manufacturer),
		path: null,
	}
}

export function getVstPluginInfo(PluginDesc) {
	let vstInfo = PluginDesc.VstPluginInfo

	return {
		name: getValue(vstInfo.PlugName),
		manufacturer: null,
		path: getValue(vstInfo.Path),
	}
}

export function getVst3PluginInfo(PluginDesc) {
	let vst3Info = PluginDesc.Vst3PluginInfo

	return {
		name: getValue(vst3Info.Name),
		path: null,
		manufacturer: null,
	}
}
