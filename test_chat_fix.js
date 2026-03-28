const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });
const chatAgent = require('./backend/services/chatAgent');

async function test() {
    try {
        console.log("Testing ChatAgent with valid URL...");
        const result = await chatAgent.parseCommand("Scan https://www.youtube.com");
        console.log("RESULT:", JSON.stringify(result, null, 2));
        if (result.url === "https://www.youtube.com") {
            console.log("SUCCESS: URL correctly extracted.");
        } else {
            console.log("FAILURE: URL not extracted correctly.");
        }
    } catch (err) {
        console.error("TEST FAILED:", err.message);
    }
}

test();
