const fs = require('fs').promises;
const path = require('path');
const Diff = require('diff');

/**
 * applyPatch - Writes a single patch to a file with backup safety
 * Supports both line-level and unified diff patches.
 */
async function applyPatch(filePath, patch) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        let updatedContent = '';

        // --- LAYER 1: BACKUP ---
        const backupPath = `${filePath}.bak`;
        await fs.writeFile(backupPath, content);

        if (patch.type === 'unified') {
            // --- LAYER 2: UNIFIED DIFF ---
            // Remove the patch header if the frontend included it (applyPatch needs pure diff)
            let diffContent = patch.content;
            if (!diffContent.startsWith('---') && !diffContent.includes('---')) {
                 diffContent = `--- a/${path.basename(filePath)}\n+++ b/${path.basename(filePath)}\n@@ -1,99 +1,99 @@\n` + diffContent;
            }
            
            const result = Diff.applyPatch(content, diffContent);
            if (!result || result === false) {
                 updatedContent = content; // Fallback
            } else {
                 updatedContent = result;
            }
        } else {
            // --- LAYER 3: LINE-LEVEL ---
            const lines = content.split('\n');
            const lineIdx = patch.line - 1;
            
            if (lines[lineIdx] !== undefined) {
                 lines[lineIdx] = patch.new;
                 updatedContent = lines.join('\n');
            } else {
                 updatedContent = content;
            }
        }

        await fs.writeFile(filePath, updatedContent);
        console.log(`[NeuralPatch]: Substrate updated for ${path.basename(filePath)}`);
        
        return { success: true, backup: backupPath, updatedContent };
    } catch (err) {
        console.error(`[NeuralPatch Fault]: ${err.message}`);
        throw err;
    }
}

async function deployAllPatches(filePath, patches) {
    const unified = patches.find(p => p.type === 'unified');
    if (unified) return await applyPatch(filePath, unified);

    let content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const sortedPatches = [...patches].sort((a, b) => b.line - a.line);

    for (const patch of sortedPatches) {
        const idx = patch.line - 1;
        if (lines[idx] !== undefined) {
            lines[idx] = patch.new;
        }
    }

    const updatedContent = lines.join('\n');
    await fs.writeFile(filePath, updatedContent);
    return { success: true, updatedContent };
}

module.exports = { applyPatch, deployAllPatches };
