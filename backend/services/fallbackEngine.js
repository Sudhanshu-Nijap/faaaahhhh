/**
 * fallbackEngine - Layer 3: System Resilience
 * Triggered if Rule and AI engines fail to produce executable patches.
 */
function generateFallback(fileName, codeContent) {
    const issues = [];
    const lines = codeContent.split('\n');

    // Rule-based heuristic fallbacks
    if (codeContent.includes('await') && !codeContent.includes('async')) {
        issues.push('System identified "await" without "async" container. Check async definition.');
    }
    
    if (codeContent.includes('function') && !codeContent.includes('return') && !codeContent.includes('void')) {
        issues.push('Function missing return signature. Verify logic branch completion.');
    }

    if (lines.length > 500) {
        issues.push('File complexity exceeds standard threshold. Consider splitting components.');
    }

    return {
        mode: 'fallback',
        fixed: false,
        message: 'Could not generate tactical patches. Manual substrate review suggested.',
        issues: issues.length > 0 ? issues : ['Potential undefined variables', 'Structural inconsistency detected.']
    };
}

module.exports = { generateFallback };
