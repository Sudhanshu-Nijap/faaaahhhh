/**
 * ruleEngine - Layer 1: Heuristic-based fixes
 * High confidence, line-level replacements for common syntax patterns.
 */
function applyRules(content) {
    const lines = content.split('\n');
    const patches = [];
    const updatedLines = [...lines];

    for (let i = 0; i < updatedLines.length; i++) {
        const originalLine = updatedLines[i];
        let newLine = originalLine;
        let comment = '';

        // Rule 1: Remove console.log (conservative mode)
        if (originalLine.includes('console.log(') && !originalLine.includes('//')) {
            newLine = originalLine.replace(/console\.log\(.*?\);?/g, '// removed debug log');
            comment = 'Removed tactical console logging for production cleanliness.';
        }

        // Rule 2: Strict Equality (Basic check)
        if (originalLine.includes(' == ') && !originalLine.includes('===') && !originalLine.includes('null')) {
            newLine = originalLine.replace(/ == /g, ' === ');
            comment = 'Coerced equality check refactored to strict identity comparison.';
        }

        // Rule 3: Add missing trailing semicolons (very basic heuristic)
        if (originalLine.trim().endsWith(')') && !originalLine.trim().endsWith(';') && !originalLine.includes('{')) {
            newLine = originalLine + ';';
            comment = 'Appended tactical semicolon for syntax normalization.';
        }

        if (newLine !== originalLine) {
            updatedLines[i] = newLine;
            patches.push({
                line: i + 1,
                old: originalLine,
                new: newLine,
                comment: comment,
                source: 'rule'
            });
        }
    }

    return {
        fixed: patches.length > 0,
        content: updatedLines.join('\n'),
        patches: patches
    };
}

module.exports = { applyRules };
