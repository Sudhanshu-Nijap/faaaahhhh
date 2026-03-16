const http = require('http');
const server = http.createServer((req, res) => {
  console.log('Request received');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok\n');
});
server.listen(5002, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:5002/');
});
