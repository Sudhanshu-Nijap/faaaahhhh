const mongoose = require('mongoose');
const ScanReport = require('./services/models/ScanReport'); // Wait, models are in ./models/ScanReport

mongoose.connect('mongodb://localhost:27017/sentinel_qa') // Assuming connection string
  .then(async () => {
    const reports = await ScanReport.find({}, 'url userId status createdAt').sort({createdAt: -1});
    console.log("ALL REPORTS:");
    reports.forEach(r => console.log(`- ID: ${r._id}, URL: "${r.url}", User: "${r.userId}", Status: ${r.status}, Date: ${r.createdAt}`));
    process.exit(0);
  })
  .catch(console.error);
