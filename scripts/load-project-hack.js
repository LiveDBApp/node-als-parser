import fs from 'fs'

/**

Notes:

Want to define what data in each json file we're interested in at a generalized
 level so we can create utilities that return this data reliably across support 
 Live versions ( 9, 10, 11, 12 )

*/

// Load and parse the JSON file
const data = JSON.parse(
	fs.readFileSync('output/live-12.3-batteries-incl.als.json', 'utf8'),
)

// Function to recursively find all paths to a specific key
function findKeyPaths(obj, targetKey, currentPath = []) {
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

// Find all paths to 'SampleRef'
const sampleRefPaths = findKeyPaths(data, 'SampleRef')

// Output the results
console.log(`Found ${sampleRefPaths.length} occurrence(s) of 'SampleRef':\n`)
sampleRefPaths.forEach((path, index) => {
	console.log(`${index + 1}. ${path}`)
})
