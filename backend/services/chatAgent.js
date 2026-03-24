const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * chatAgent - Conversational Assistant for Sentinel QA
 * 
 * Parses user natural language commands into structured scan intents.
 */
class ChatAgent {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async parseCommand(message, contextUrl = null) {
        const prompt = `
            You are "Sentinel QA GPT", an elite autonomous testing agent. 
            The user wants to perform a "QA Session" on a specific target.

            URGENT CONTEXT:
            - Current Target URL: ${contextUrl || "UNKNOWN (Ask for it)"}
            - Latest Message: "${message}"

            YOUR MISSION:
            1. NEVER use narrative (no "Sentinel initiates...", no "tactical strike...").
            2. reasoning: Max 12 words. Example: "Targeting YouTube. Auditing video logic and responsive layout."
            3. testCases: Max 3 items. EACH MUST be 1-4 words. (e.g. "Validate playback").
            4. Tone: Minimalist. Direct. 0% fluff.
            5. Map to: [FULL_SCAN, CHAOS_TEST, FORM_TEST, SECURITY_AUDIT, QUICK_DIAGNOSTIC].

            CAPABILITIES:
            - FULL_SCAN: Deep audit of an entire website.
            - CHAOS_TEST: Run AI Smart Fuzzing on forms.
            - FORM_TEST: Run Smart Form Agent (validation matrix).
            - SECURITY_AUDIT: Header/SSL/Transmission checks.
            - QUICK_DIAGNOSTIC: Performance/Console/Network logs.

            OUTPUT FORMAT (JSON ONLY):
            {
                "intent": "...",
                "url": "...",
                "reasoning": "MAX 12 WORDS: Short technical summary.",
                "testCases": ["Short task 1", "Short task 2", "Short task 3"],
                "needsMoreInfo": false,
                "followUpQuestion": ""
            }
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            const cleanJson = responseText.substring(
                responseText.indexOf("{"),
                responseText.lastIndexOf("}") + 1
            );

            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("[ChatAgent Error]:", error.message);
            return {
                intent: "UNKNOWN",
                reasoning: "System failure in neural linguistic processing. Please provide a direct URL.",
                needsMoreInfo: true,
                followUpQuestion: "Could you please specify the target URL and the type of test you'd like to run?"
            };
        }
    }
}

module.exports = new ChatAgent();
