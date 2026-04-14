const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const ScanReport = require('../backend/models/ScanReport');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const reports = await ScanReport.find().sort({ createdAt: -1 }).limit(5);
    console.log('Recent Reports:', JSON.stringify(reports, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
