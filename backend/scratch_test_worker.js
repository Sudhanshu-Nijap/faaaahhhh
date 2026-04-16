const { Worker } = require('worker_threads');
const path = require('path');

const worker = new Worker(`
  const { parentPort } = require('worker_threads');
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  const path = require('path');
  
  dotenv.config({ path: path.join(__dirname, '../.env') });
  
  console.log('Worker URI:', process.env.MONGODB_URI);
  
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Worker DB Success');
      parentPort.postMessage('success');
    })
    .catch(e => {
      console.error('Worker DB Fail:', e.message);
      parentPort.postMessage('fail');
    });
`, { eval: true });

worker.on('message', (msg) => {
  console.log('Message from worker:', msg);
  process.exit(0);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('Test timed out');
  process.exit(1);
}, 15000);
