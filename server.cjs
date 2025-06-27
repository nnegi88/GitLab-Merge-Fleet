const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log('Request:', req.url);
  
  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  
  // Handle client-side routing - if file doesn't exist and no extension, serve index.html
  if (!fs.existsSync(filePath) && !path.extname(req.url)) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }
  
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error('Error reading file:', filePath, err);
      res.writeHead(404);
      res.end('File not found: ' + req.url);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(5000, '0.0.0.0', () => {
  console.log('GitLab Merge Fleet running on http://localhost:5000');
});