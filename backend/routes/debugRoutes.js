const express = require('express');
const router = express.Router();
const fileScanner = require('../services/fileScanner');
const scanExecutor = require('../services/scanExecutor');
const patchApplier = require('../services/patchApplier');

/**
 * debug/run - Main tactical entry point for neural code debugging
 * Accepts folderPath, scans code, and returns patches and updated source.
 */
router.post('/run', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) {
        return res.status(400).json({ error: 'Folder Path Substrate Required.' });
    }

    try {
        const filesToScan = await fileScanner.scanDirectory(folderPath);
        
        if (filesToScan.length === 0) {
            return res.status(200).json({ 
                status: 'error', 
                error: 'No valid source artifacts detected in target substrate. Ensure folder contains .js, .html, or .css files.',
                files: []
            });
        }

        // --- STEP 2: Execute Multi-Layer Audit ---
        const auditPool = filesToScan.slice(0, 15);
        const results = [];

        for (const file of auditPool) {
            try {
                const auditResult = await scanExecutor.processFile(file);
                // Return full path but slightly masked in response metadata? 
                // No, UI needs the path to call patch endpoint.
                results.push({ ...auditResult, path: file.path });
            } catch (err) {
                console.error(`[DebugAPI]: File audit fault for ${file.name}:`, err.message);
                results.push({
                    file: file.name,
                    status: 'error',
                    message: err.message,
                    path: file.path
                });
            }
        }

        res.json({
            status: 'success',
            scannedCount: filesToScan.length,
            auditedCount: auditPool.length,
            files: results
        });

    } catch (err) {
        console.error('[DebugAPI Critical Breach]:', err.message);
        res.status(500).json({ error: 'Tactical debugging substrate failed: ' + err.message });
    }
});

/**
 * debug/patch - Applies a single neural patch to a source file
 */
router.post('/patch', async (req, res) => {
    const { filePath, patch } = req.body;
    if (!filePath || !patch) return res.status(400).json({ error: 'Patch substrate missing.' });

    try {
        const result = await patchApplier.applyPatch(filePath, patch);
        res.json({ status: 'deployed', file: filePath, ...result });
    } catch (err) {
        res.status(500).json({ error: `Neural Deployment Failure: ${err.message}` });
    }
});

/**
 * debug/deploy-all - Tactical batch deployment for multiple neural patches
 */
router.post('/deploy-all', async (req, res) => {
    const { filePath, patches } = req.body;
    if (!filePath || !patches) return res.status(400).json({ error: 'Full batch substrate missing.' });

    try {
        const result = await patchApplier.deployAllPatches(filePath, patches);
        res.json({ status: 'deployed_batch', file: filePath, ...result });
    } catch (err) {
        res.status(500).json({ error: `Neural Batch Deployment Failure: ${err.message}` });
    }
});

/**
 * debug/upload - Direct neural auditing of an uploaded code substrate (in-memory)
 */
router.post('/upload', async (req, res) => {
    const { fileName, content } = req.body;
    if (!fileName || !content) return res.status(400).json({ error: 'Source substrate missing.' });

    try {
        console.log(`[DebugAPI]: Auditing uploaded source: ${fileName}`);
        
        // Mock a fileInfo for the scanExecutor
        const virtualFile = {
            name: fileName,
            path: 'memory://' + fileName,
            isMemory: true
        };

        const result = await scanExecutor.processFile({ 
            ...virtualFile, 
            content // We'll modify processFile to handle direct content if provided
        });

        res.json({
            status: 'success',
            files: [result]
        });

    } catch (err) {
        console.error('[DebugAPI Upload Fault]:', err.message);
        res.status(500).json({ error: 'Neural Upload audit failed: ' + err.message });
    }
});

module.exports = router;
