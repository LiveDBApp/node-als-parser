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
