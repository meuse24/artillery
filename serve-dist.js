import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const host = '127.0.0.1';
const port = 4173;
const base = path.resolve('dist');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const requestPath = (req.url ?? '/').split('?')[0];
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(base, relativePath);

  if (!filePath.startsWith(base)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] ?? 'application/octet-stream'
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`listening http://${host}:${port}`);
});
