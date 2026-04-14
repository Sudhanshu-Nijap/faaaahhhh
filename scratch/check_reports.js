const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const ScanReport = require('./backend/models/ScanReport');
    const reports = await ScanReport.find().sort({ createdAt: -1 }).limit(1);
    console.log(JSON.stringify(reports[0], null, 2));
    process.exit(0);
}

check();
