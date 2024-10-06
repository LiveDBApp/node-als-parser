import { promises as fs } from 'fs'
import { createUnzip } from 'zlib'
import { Readable } from 'stream'
import { promisify } from 'util'
import xml2js from 'xml2js'
import path from 'path'

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

export async function findAlsFiles(directoryPath) {
	const alsFiles = []

	async function recursiveSearch(currentPath) {
		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name)

				if (entry.isDirectory()) {
					await recursiveSearch(fullPath)
				} else if (entry.isFile() && path.extname(entry.name) === '.als') {
					alsFiles.push(path.resolve(fullPath))
				}
			}
		} catch (error) {
			console.error(`Error accessing ${currentPath}: ${error.message}`)
		}
	}

	await recursiveSearch(directoryPath)
	return alsFiles
}
