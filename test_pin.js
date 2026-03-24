const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const ScanReport = require('./backend/models/ScanReport');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function testPin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        const id = '69b974b092a42a95d4a22504';
        const report = await ScanReport.findById(id);
        if (!report) {
            console.log('Report not found');
            process.exit(0);
        }
        
        console.log('Before toggle:', report.isPinned);
        report.isPinned = !report.isPinned;
        await report.save();
        console.log('After toggle:', report.isPinned);
        
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

testPin();
