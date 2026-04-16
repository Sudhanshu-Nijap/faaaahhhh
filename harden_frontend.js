const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');
const apiImport = "import { API_URL, SOCKET_URL } from '../config/api';";

function processDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            processDir(filePath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('http://localhost:5005')) {
                console.log(`Processing ${filePath}...`);
                
                // Add import if not present
                if (!content.includes('from \'../config/api\'') && !content.includes('from \'./config/api\'')) {
                    // Determine relative path for import
                    const rel = path.relative(dir, path.join(srcDir, 'config', 'api.js')).replace(/\\/g, '/').replace('.js', '');
                    content = `import { API_URL, SOCKET_URL } from '${rel.startsWith('.') ? rel : './' + rel}';\n` + content;
                }

                // Replace URL
                content = content.replace(/http:\/\/localhost:5005/g, '${API_URL}');
                
                // Ensure template literals
                // Find axios calls or io calls that might still use single quotes
                content = content.replace(/'\$\{API_URL\}([^']*)'/g, '`${API_URL}$1`');
                content = content.replace(/"\$\{API_URL\}([^"]*)"/g, '`${API_URL}$1`');

                fs.writeFileSync(filePath, content);
            }
        }
    });
}

processDir(srcDir);
console.log('Production hardening complete.');
