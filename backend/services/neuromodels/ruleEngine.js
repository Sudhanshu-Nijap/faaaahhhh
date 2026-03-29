const prettier = require('prettier');
const { ESLint } = require('eslint');
const Diff = require('diff');

const getParser = (ext) => {
    switch (ext) {
        case '.ts': case '.tsx': return 'typescript';
        case '.html': return 'html';
        case '.css': return 'css';
        case '.json': return 'json';
        default: return 'babel';
    }
};

const applyRules = async (code, extension = '.js') => {
    let updatedCode = code;
    const patches = [];

    // Layer 1.1: Prettier
    try {
        const parser = getParser(extension);
        const formatted = await prettier.format(updatedCode, {
            parser,
            singleQuote: true,
            semi: true,
            tabWidth: 2,
        });

        if (formatted !== updatedCode) {
            const patch = Diff.createTwoFilesPatch('original', 'formatted', updatedCode, formatted);
            patches.push({ type: 'unified', content: patch, reason: 'Neural Formatting Optimization' });
            updatedCode = formatted;
        }
    } catch (e) { console.warn('[Neuromodels]: Prettier bypassed:', e.message); }

    // Layer 1.2: Regex Guard (Fast Syntax)
    if (extension === '.js' || extension === '.jsx') {
        let regexCode = updatedCode;
        if (regexCode.includes(' == ') && !regexCode.includes(' === ')) {
            regexCode = regexCode.replace(/ == /g, ' === ');
        }
        if (regexCode !== updatedCode) {
            patches.push({ line: 'Regex', old: '==', new: '===', reason: 'Strict Equality Enforcement' });
            updatedCode = regexCode;
        }
    }

    return { fixed: patches.length > 0, code: updatedCode, patches };
};

module.exports = { applyRules };
