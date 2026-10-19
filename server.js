const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.ogg': 'audio/ogg',
  '.json': 'application/json'
};

const WEB_DIR = path.join(__dirname, 'www');

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  if (req.method === 'POST' && reqPath === '/api/save-screenshot') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        const base64Data = json.image.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(path.join(WEB_DIR, json.filename || 'screenshot.png'), base64Data, 'base64');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.message);
      }
    });
    return;
  }

  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  
  const filePath = path.join(WEB_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLanIp();
  console.log(`N-Ball Server running at:`);
  console.log(`  - Local:   http://localhost:${PORT}/`);
  console.log(`  - Network: http://${lanIp}:${PORT}/`);
});
