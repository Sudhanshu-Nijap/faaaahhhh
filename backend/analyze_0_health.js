const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const ScanReport = require('./models/ScanReport');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const report = await ScanReport.findOne({ url: 'https://www.digitalindia.gov.in/', status: 'completed' }).sort({ createdAt: -1 });
        if (report) {
            console.log(`URL: ${report.url}`);
            console.log(`HealthScore: ${report.healthScore}`);
            console.log(`NetworkLogs: ${report.networkLogs?.length}`);
            console.log(`ConsoleErrors: ${report.consoleErrors?.length}`);
            console.log(`BrokenLinks: ${report.brokenLinks?.length}`);
            console.log(`UI Issues: ${report.uiIssues?.length}`);
            console.log(`Accessibility: ${report.accessibilityIssues?.length}`);
        }
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
})();
