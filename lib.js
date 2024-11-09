import { promises as fs } from 'node:fs'
import { createUnzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { promisify } from 'node:util'
import xml2js from 'xml2js'
import path from 'node:path'
import { createReadStream } from 'fs'
import { createHash } from 'crypto'

const streamToBuffer = async (stream) => {
	const chunks = []
	for await (const chunk of stream) {
		chunks.push(chunk)
	}
	return Buffer.concat(chunks)
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
