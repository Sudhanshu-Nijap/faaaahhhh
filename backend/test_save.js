const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const ScanReport = require('./models/ScanReport');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testSave() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const id = '69b974b092a42a95d4a22504';
        const report = await ScanReport.findById(id);
        console.log('Loaded report. consoleErrors type:', typeof report.consoleErrors[0]);
        
        report.isPinned = !report.isPinned;
        await report.save();
        console.log('SUCCESS');
        process.exit(0);
    } catch (err) {
        console.error('CAUGHT ERROR:', err);
        process.exit(1);
    }
}

testSave();
