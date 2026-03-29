const ruleEngine = require('./neuromodels/ruleEngine');
const aiEngine = require('./neuromodels/aiEngine');
const wholeFallbackModel = require('./neuromodels/wholeFallbackModel');
const fs = require('fs').promises;

/**
 * processFile - Absolute Neural Orchestrator (V3)
 * Layer 1: Rule Engine (Formatting/Strict Equality)
 * Layer 2: Fast AI (Llama 8B Line-Level Patching)
 * Layer 3: Heavy AI (Llama 70B Whole-File Logic/Unified Patch)
 */
async function processFile(fileInfo) {
    const { path: filePath, name: fileName, content: providedContent } = fileInfo;
    const originalContent = providedContent !== undefined 
        ? providedContent 
        : await fs.readFile(filePath, 'utf8');

    const ext = fileName.split('.').pop();

    // --- Layer 1: Rule Engine ---
    console.log(`[NeuralV3]: Scanning ${fileName} (Layer 1: Rules)...`);
    const ruleResult = await ruleEngine.applyRules(originalContent, '.' + ext);
    if (ruleResult.fixed && ruleResult.patches.length > 0) {
        return {
            file: fileName,
            source: 'rule',
            confidence: '100%',
            patches: ruleResult.patches,
            updatedCode: ruleResult.code,
            fixed: true
        };
    }

    // --- Layer 2: Fast AI Engine (8B) ---
    console.log(`[NeuralV3]: Scanning ${fileName} (Layer 2: Fast AI)...`);
    const aiResult = await aiEngine.aiFixCode(originalContent);
    if (aiResult.success && !aiResult.fallback_required && aiResult.patches?.length > 0) {
        return {
            file: fileName,
            source: 'ai',
            confidence: aiResult.confidence || '90%',
            patches: aiResult.patches.map(p => ({ ...p, type: 'line' })),
            updatedCode: applyLinePatches(originalContent, aiResult.patches),
            fixed: true
        };
    }

    // --- Layer 3: Heavy AI Engine (70B) ---
    console.log(`[NeuralV3]: Scanning ${fileName} (Layer 3: Heavy Logic Overhaul)...`);
    const heavyResult = await wholeFallbackModel.generateWholeFallback(fileName, originalContent);
    if (heavyResult.success && heavyResult.patch) {
        return {
            file: fileName,
            source: 'wholefallback',
            confidence: '98%',
            patches: [{ type: 'unified', content: heavyResult.patch, reason: 'Neural Whole-File Logic Correction' }],
            updatedCode: heavyResult.fixedCode,
            fixed: true
        };
    }

    return {
        file: fileName,
        source: 'fallback',
        confidence: 'N/A',
        patches: [],
        updatedCode: originalContent,
        fixed: false,
        message: 'Neural substrate could not safely resolve this artifact.'
    };
}

/**
 * applyLinePatches - Utility for immediate code modification for Layer 1/2
 */
function applyLinePatches(code, patches) {
    const lines = code.split('\n');
    for (const patch of patches) {
        const idx = patch.line - 1;
        if (lines[idx] && (lines[idx].trim() === patch.old.trim() || lines[idx].includes(patch.old.trim()))) {
            lines[idx] = lines[idx].replace(patch.old.trim(), patch.new.trim());
        }
    }
    return lines.join('\n');
}

module.exports = { processFile };
