// server.js — CodeShell C++ Proxy Server
// ─────────────────────────────────────────
// Run with:  node server.js
// Then open: http://localhost:3000
// ─────────────────────────────────────────

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const PORT  = 3000;

// ── MIME types for static file serving ──
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {

  // CORS headers — allow the widget to call /compile
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── POST /compile  →  proxy to Wandbox ──
  if (req.method === 'POST' && req.url === '/compile') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log(`[compile] Forwarding to Wandbox...`);

      const options = {
        hostname: 'wandbox.org',
        path:     '/api/compile.json',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          console.log(`[compile] Wandbox responded: HTTP ${proxyRes.statusCode}`);
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      proxyReq.on('error', err => {
        console.error('[compile] Error reaching Wandbox:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not reach Wandbox: ' + err.message }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // ── GET /  →  serve code-terminal-widget.html ──
  // ── GET /anything.html  →  serve that file ──
  let filePath = req.url === '/' ? '/code-terminal-widget.html' : req.url;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + req.url);
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   CodeShell Server — ready!          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║   http://localhost:${PORT}               ║`);
  console.log('  ║                                      ║');
  console.log('  ║   Ctrl+C to stop                     ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
