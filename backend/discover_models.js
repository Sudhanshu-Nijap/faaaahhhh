const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function discover() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        // The listModels method is actually part of the Google AI system, 
        // but in the JS SDK, you sometimes have to use the REST API or a specific client.
        // Let's try to see if we can find any model that works.
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "gemini-pro",
            "gemini-2.0-flash-exp"
        ];
        
        for (const m of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("hi");
                console.log(`Model ${m} works!`);
                return;
            } catch (e) {
                console.log(`Model ${m} failed: ${e.message}`);
            }
        }
    } catch (err) {
        console.error("Discovery failed:", err.message);
    }
}

discover();
