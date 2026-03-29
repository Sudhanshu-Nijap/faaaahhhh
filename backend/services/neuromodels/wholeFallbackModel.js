const axios = require('axios');
const Diff = require('diff');

const generateWholeFallback = async (filePath, code) => {
    try {
        console.log(`[WholeFallback] Neural Logic Overhaul for ${filePath}...`);

        const groqKey = process.env.GROQ_QA_API_KEY || process.env.GROQ_API_KEY;
        const model = process.env.GROQ_QA_MODEL || 'llama-3.3-70b-versatile';

        if (!groqKey) throw new Error('Groq Key missing');

        const body = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: 'You are a senior developer. Analyze and fix the entire code. Return ONLY the fixed code body. No markdown. No explanation. Just the code.'
                },
                { role: "user", content: `Analyze and fix: ${filePath}\n\n${code}` }
            ],
            temperature: 0.1,
            max_tokens: 32768
        };

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
        });

        let fixedCode = res.data.choices[0].message.content;
        fixedCode = fixedCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');

        const patch = Diff.createTwoFilesPatch(`a/${filePath}`, `b/${filePath}`, code, fixedCode);

        return { success: true, patch: patch, fixedCode: fixedCode };
    } catch (e) {
        console.error('[Neuromodels]: Fallback Layer 3 Error:', e.message);
        return { success: false, patch: null };
    }
};

module.exports = { generateWholeFallback };
