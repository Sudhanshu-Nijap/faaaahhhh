const path = require('path');
const fs = require('fs').promises;

/**
 * fileScanner - Recursively scans a local directory for source code
 * Excludes node_modules, dist, build, and hidden folders
 */
async function scanDirectory(dirPath) {
    const results = [];
    const absolutePath = path.resolve(dirPath);

    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(absolutePath, entry.name);
        
        // Skip common ignore patterns
        if (entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'build' || 
            entry.name === '.git' || 
            entry.name.startsWith('.')) {
            continue;
        }

        if (entry.isDirectory()) {
            results.push(...await scanDirectory(fullPath));
        } else {
            // Only include supported source files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json'].includes(ext)) {
                results.push({
                    name: entry.name,
                    path: fullPath,
                    relativePath: path.relative(absolutePath, fullPath)
                });
            }
        }
    }

    return results;
}

module.exports = { scanDirectory };
