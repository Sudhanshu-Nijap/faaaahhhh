const http = require('http');

console.log('Initiating test scan for http://127.0.0.1:5002/ ...');

// The backend requires both a URL and a userId to construct the report.
const data = JSON.stringify({ 
  url: 'http://127.0.0.1:5002/',
  userId: 'local-test-user-001' 
});

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/scan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    try {
        const json = JSON.parse(responseData);
        console.log("SCAN STARTED. Report ID:", json.reportId || json._id);
        console.log("The scanner is now running in the background.");
        console.log("Please check your frontend dashboard in a few minutes to view the new Interaction Logs segment.");
    } catch(e) {
        console.log("Response:", responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error. Make sure the main backend server (npm run dev) is running on port 5000:', error);
});

req.write(data);
req.end();
