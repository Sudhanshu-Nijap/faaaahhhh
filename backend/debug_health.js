const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const ScanReport = require('./models/ScanReport');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const reports = await ScanReport.find({ status: 'completed' }).limit(5).select('url healthScore status networkLogs consoleErrors brokenLinks uiIssues formIssues accessibilityIssues lighthouseScores');
        console.log(JSON.stringify(reports, null, 2));
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
})();
