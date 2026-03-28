const Groq = require('groq-sdk');

class LearningAgent {
    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        this.groq = new Groq({ apiKey });
        this.modelName = process.env.GROQ_LEARNING_MODEL || 'llama-3.1-8b-instant';
    }

    async askDebugging(question) {
        const prompt = `
            You are a Senior QA Automation Engineer and Debugging Expert for the Sentinel AI platform.
            The user is asking a debugging related question in the "Learning Hub".
            
            QUESTION: "${question}"
            
            TASK: 
            Provide a simple, clear, and actionable response.
            Focus on debugging steps that a beginner or intermediate developer can follow.
            
            OUTPUT FORMAT (STRICT JSON ONLY):
            {
              "explanation": "A concise (2-3 sentence) explanation of what the problem/concept is.",
              "example": "A short, relevant code snippet illustrating the problem or the diagnostic step.",
              "fix": "A single clear sentence on how to solve it permanently.",
              "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
            }
        `;

        try {
            const result = await this.groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.modelName,
                temperature: 0.5,
                response_format: { type: "json_object" }
            });
            
            return JSON.parse(result.choices[0].message.content);
        } catch (e) {
            console.error('[learningAgent]: Failed to consult neural substrate:', e.message);
            // Fallback response
            return {
                explanation: "The neural uplink is currently saturated. Based on typical patterns, this issue usually relates to state management or asynchronous execution.",
                example: "// Fallback Diagnostic\nconsole.log('TRACE:', error.stack);",
                fix: "Verify your environment variables and network connectivity.",
                steps: ["Step 1: Check your .env configuration.", "Step 2: Ensure the backend server is active.", "Step 3: Try restarting the diagnostic pipeline."]
            };
        }
    }
}

module.exports = new LearningAgent();
